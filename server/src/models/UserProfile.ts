import mongoose, { Schema } from "mongoose";

const userProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bio: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "India" },
    pincode: { type: String, default: "" },
    address: { type: String, default: "" },
    occupation: { type: String, default: "" },
    timezone: { type: String, default: "Asia/Kolkata" },
    notifyEmail: { type: Boolean, default: true },
    notifyInApp: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const UserProfile = mongoose.model("UserProfile", userProfileSchema);
