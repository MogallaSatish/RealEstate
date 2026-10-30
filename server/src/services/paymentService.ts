import { env } from "../config/env.js";
import { Payment } from "../models/Payment.js";
import { Property } from "../models/Property.js";
import { SubscriptionPlan } from "../models/SubscriptionPlan.js";
import { UserSubscription } from "../models/UserSubscription.js";
import { User } from "../models/User.js";
import { buildQr, buildUpiUri, createMerchantRef, verifyWebhookSignature } from "../integrations/upi.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { writeAudit } from "./audit.js";
import { notifyUser } from "./notify.js";

export async function createOrder(userId: string, input: {
  purpose: "featured_listing" | "premium_listing" | "listing_package" | "agent_subscription";
  propertyId?: string;
  planId?: string;
  idempotencyKey?: string;
}) {
  if (input.idempotencyKey) {
    const existing = await Payment.findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) return existing;
  }
  let amountPaise = 0;
  let plan = null;
  if (input.planId) {
    plan = await SubscriptionPlan.findById(input.planId);
    if (!plan || !plan.active) throw badRequest("Invalid plan");
    amountPaise = plan.pricePaise;
  } else if (input.purpose === "featured_listing") {
    amountPaise = 49900;
    if (!input.propertyId) throw badRequest("propertyId required");
    const prop = await Property.findById(input.propertyId);
    if (!prop) throw notFound("Property not found");
    if (String(prop.listedBy) !== userId) throw forbidden();
  } else if (input.purpose === "premium_listing") {
    amountPaise = 99900;
  } else {
    throw badRequest("Specify a plan");
  }

  const merchantRef = createMerchantRef();
  const upiUri = buildUpiUri({
    amountPaise,
    merchantRef,
    note: `EstateHub ${input.purpose}`,
  });
  const qrDataUrl = await buildQr(upiUri);
  const payment = await Payment.create({
    userId,
    amountPaise,
    purpose: input.purpose,
    propertyId: input.propertyId,
    planId: plan?._id,
    merchantRef,
    status: "pending",
    upiVpa: env.upi.merchantVpa,
    upiUri,
    qrDataUrl,
    sandbox: env.upi.sandbox,
    idempotencyKey: input.idempotencyKey,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });
  return payment;
}

export async function confirmVerifiedPayment(opts: {
  merchantRef: string;
  providerTxnId: string;
  amountPaise: number;
  payload?: unknown;
}) {
  const payment = await Payment.findOne({ merchantRef: opts.merchantRef });
  if (!payment) throw notFound("Payment not found");
  if (payment.status === "successful") return payment;
  if (payment.amountPaise !== opts.amountPaise) throw badRequest("Amount mismatch");
  if (payment.expiresAt && payment.expiresAt < new Date()) {
    payment.status = "expired";
    await payment.save();
    throw badRequest("Payment expired");
  }
  payment.status = "successful";
  payment.providerTxnId = opts.providerTxnId;
  payment.rawProviderPayload = opts.payload;
  await payment.save();
  await activateEntitlement(payment);
  const user = await User.findById(payment.userId).lean();
  if (user) {
    await notifyUser({
      userId: String(user._id),
      title: "Payment verified",
      body: `UPI payment ${payment.merchantRef} was verified. Your service is now active.`,
      type: "payment",
      link: "/dashboard/payments",
      email: user.email,
    });
  }
  await writeAudit({
    actorId: String(payment.userId),
    action: "payment.verified",
    entity: "Payment",
    entityId: String(payment._id),
    metadata: { merchantRef: payment.merchantRef, sandbox: payment.sandbox },
  });
  return payment;
}

async function activateEntitlement(payment: InstanceType<typeof Payment>) {
  if (payment.purpose === "featured_listing" && payment.propertyId) {
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Property.findByIdAndUpdate(payment.propertyId, { featuredUntil: until, isPremium: true });
  }
  if (payment.planId) {
    const plan = await SubscriptionPlan.findById(payment.planId);
    if (plan) {
      const startsAt = new Date();
      const endsAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
      await UserSubscription.create({
        userId: payment.userId,
        planId: plan._id,
        paymentId: payment._id,
        startsAt,
        endsAt,
        status: "active",
      });
      if (plan.featuredDays && payment.propertyId) {
        await Property.findByIdAndUpdate(payment.propertyId, {
          featuredUntil: new Date(Date.now() + plan.featuredDays * 24 * 60 * 60 * 1000),
          isPremium: true,
        });
      }
    }
  }
}

export async function handleWebhook(rawBody: string, signature: string, parsed: {
  merchantRef: string;
  providerTxnId: string;
  amountPaise: number;
  status: string;
}) {
  if (!verifyWebhookSignature(rawBody, signature)) throw forbidden("Invalid webhook signature");
  if (parsed.status !== "successful") {
    await Payment.findOneAndUpdate(
      { merchantRef: parsed.merchantRef, status: { $ne: "successful" } },
      { status: parsed.status === "failed" ? "failed" : "processing", providerTxnId: parsed.providerTxnId },
    );
    return;
  }
  return confirmVerifiedPayment(parsed);
}

export async function sandboxConfirm(merchantRef: string, confirmKey: string) {
  if (!env.upi.sandbox) throw forbidden("Sandbox confirmation is disabled");
  if (confirmKey !== env.upi.sandboxConfirmKey) throw forbidden("Invalid sandbox key");
  const payment = await Payment.findOne({ merchantRef });
  if (!payment) throw notFound();
  return confirmVerifiedPayment({
    merchantRef,
    providerTxnId: `SANDBOX-${merchantRef}`,
    amountPaise: payment.amountPaise,
    payload: { sandbox: true },
  });
}

export async function expireStalePayments() {
  await Payment.updateMany(
    { status: "pending", expiresAt: { $lt: new Date() } },
    { $set: { status: "expired" } },
  );
}
