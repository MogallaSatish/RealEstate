import mongoose, { Schema } from "mongoose";
import { INQUIRY_STATUS } from "../types/enums.js";

const inquirySchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: "User" },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    message: { type: String, required: true },
    preferredContact: { type: String, enum: ["phone", "email", "whatsapp"], default: "phone" },
    preferredVisitDate: Date,
    status: { type: String, enum: INQUIRY_STATUS, default: "new" },
    response: { type: String, default: "" },
  },
  { timestamps: true },
);

inquirySchema.index({ createdAt: -1 });

export const Inquiry = mongoose.model("Inquiry", inquirySchema);
