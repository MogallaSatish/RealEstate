import mongoose, { Schema } from "mongoose";

const agentProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    licenseNumber: { type: String, default: "" },
    experienceYears: { type: Number, default: 0 },
    specialization: { type: String, default: "" },
    about: { type: String, default: "" },
    languages: { type: [String], default: ["English", "Telugu"] },
    serviceAreas: { type: [String], default: [] },
    agencyId: { type: Schema.Types.ObjectId, ref: "Agency" },
    verified: { type: Boolean, default: false },
    ratingAverage: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

agentProfileSchema.index({ verified: 1, ratingAverage: -1 });

export const AgentProfile = mongoose.model("AgentProfile", agentProfileSchema);
