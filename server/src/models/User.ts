import mongoose, { Schema } from "mongoose";
import { USER_ROLES, USER_STATUSES } from "../types/enums.js";

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, required: true },
    status: { type: String, enum: USER_STATUSES, default: "active" },
    emailVerified: { type: Boolean, default: false },
    avatarUrl: { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    lastLoginAt: Date,
    identityVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model("User", userSchema);
