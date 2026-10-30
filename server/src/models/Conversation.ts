import mongoose, { Schema } from "mongoose";

const conversationSchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessageAt: Date,
    lastMessagePreview: { type: String, default: "" },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
