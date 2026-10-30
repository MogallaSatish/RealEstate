import mongoose, { Schema } from "mongoose";

const userSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: { type: String, enum: ["active", "expired", "cancelled"], default: "active" },
  },
  { timestamps: true },
);

export const UserSubscription = mongoose.model("UserSubscription", userSubscriptionSchema);
