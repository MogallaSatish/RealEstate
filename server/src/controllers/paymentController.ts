import type { Request, Response } from "express";
import { Payment } from "../models/Payment.js";
import { SubscriptionPlan } from "../models/SubscriptionPlan.js";
import { UserSubscription } from "../models/UserSubscription.js";
import { createOrder, handleWebhook, sandboxConfirm } from "../services/paymentService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { env } from "../config/env.js";
import { upiApps } from "../integrations/upi.js";

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await createOrder(req.user!.id, req.body);
  res.status(201).json({
    payment: {
      id: payment._id,
      merchantRef: payment.merchantRef,
      amountPaise: payment.amountPaise,
      status: payment.status,
      upiUri: payment.upiUri,
      upiVpa: payment.upiVpa,
      qrDataUrl: payment.qrDataUrl,
      sandbox: payment.sandbox,
      expiresAt: payment.expiresAt,
      apps: upiApps,
    },
    notice: payment.sandbox
      ? "SANDBOX: This is not a live UPI collection. Do not send real money. Use the sandbox confirm action in development."
      : "Complete payment in your UPI app. Activation happens only after server-side verification.",
  });
});

export const myPayments = asyncHandler(async (req: Request, res: Response) => {
  const items = await Payment.find({ userId: req.user!.id }).sort({ createdAt: -1 }).lean();
  res.json({ items });
});

export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await Payment.findOne({ _id: req.params.id, userId: req.user!.id }).lean();
  res.json({ payment });
});

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = String(req.headers["x-upi-signature"] ?? "");
  const raw = JSON.stringify(req.body);
  await handleWebhook(raw, signature, req.body);
  res.json({ ok: true });
});

export const sandbox = asyncHandler(async (req: Request, res: Response) => {
  const payment = await sandboxConfirm(req.body.merchantRef, req.body.confirmKey ?? env.upi.sandboxConfirmKey);
  res.json({ payment, sandbox: true });
});

export const publicPlans = asyncHandler(async (_req: Request, res: Response) => {
  const items = await SubscriptionPlan.find({ active: true }).lean();
  res.json({ items, sandbox: env.upi.sandbox });
});

export const mySubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const items = await UserSubscription.find({ userId: req.user!.id }).populate("planId").sort({ createdAt: -1 }).lean();
  res.json({ items });
});
