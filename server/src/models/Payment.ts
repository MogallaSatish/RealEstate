import mongoose, { Schema } from "mongoose";
import { PAYMENT_STATUS } from "../types/enums.js";

const paymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    purpose: {
      type: String,
      enum: ["featured_listing", "premium_listing", "listing_package", "agent_subscription"],
      required: true,
    },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    planId: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan" },
    merchantRef: { type: String, required: true, unique: true },
    providerTxnId: { type: String, default: "" },
    status: { type: String, enum: PAYMENT_STATUS, default: "pending" },
    upiVpa: { type: String, default: "" },
    upiUri: { type: String, default: "" },
    qrDataUrl: { type: String, default: "" },
    sandbox: { type: Boolean, default: true },
    receiptUrl: { type: String, default: "" },
    idempotencyKey: { type: String, unique: true, sparse: true },
    rawProviderPayload: { type: Schema.Types.Mixed },
    expiresAt: Date,
  },
  { timestamps: true },
);

paymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model("Payment", paymentSchema);
