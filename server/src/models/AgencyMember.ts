import mongoose, { Schema } from "mongoose";

const agencyMemberSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: "Agency", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    memberRole: { type: String, default: "agent" },
  },
  { timestamps: true },
);

agencyMemberSchema.index({ agencyId: 1, userId: 1 }, { unique: true });

export const AgencyMember = mongoose.model("AgencyMember", agencyMemberSchema);
