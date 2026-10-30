import mongoose, { Schema } from "mongoose";

const propertyViewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String, default: "" },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

propertyViewSchema.index({ userId: 1, propertyId: 1, viewedAt: -1 });
propertyViewSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export const PropertyView = mongoose.model("PropertyView", propertyViewSchema);
