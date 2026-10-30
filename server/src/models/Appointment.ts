import mongoose, { Schema } from "mongoose";
import { APPOINTMENT_STATUS } from "../types/enums.js";

const appointmentSchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    requesterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 30 },
    message: { type: String, default: "" },
    status: { type: String, enum: APPOINTMENT_STATUS, default: "pending" },
    alternativeTime: Date,
  },
  { timestamps: true },
);

appointmentSchema.index({ propertyId: 1, scheduledAt: 1 });
appointmentSchema.index({ hostId: 1, scheduledAt: 1 });
appointmentSchema.index(
  { propertyId: 1, scheduledAt: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "confirmed" } },
);

export const Appointment = mongoose.model("Appointment", appointmentSchema);
