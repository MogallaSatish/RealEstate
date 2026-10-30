import mongoose, { Schema } from "mongoose";

const agencySchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Agency = mongoose.model("Agency", agencySchema);
