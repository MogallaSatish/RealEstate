import mongoose, { Schema } from "mongoose";

const subscriptionPlanSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    audience: { type: String, enum: ["owner", "agent", "listing"], required: true },
    pricePaise: { type: Number, required: true },
    durationDays: { type: Number, required: true },
    featuredDays: { type: Number, default: 0 },
    listingLimit: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const SubscriptionPlan = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
