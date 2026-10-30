import mongoose, { Schema } from "mongoose";

const reportSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User" },
    reason: { type: String, required: true },
    details: { type: String, default: "" },
    status: { type: String, enum: ["open", "reviewing", "resolved", "dismissed"], default: "open" },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true },
);

export const Report = mongoose.model("Report", reportSchema);
