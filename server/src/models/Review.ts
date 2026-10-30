import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    agentId: { type: Schema.Types.ObjectId, ref: "User" },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "" },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

reviewSchema.index({ propertyId: 1, authorId: 1 });

export const Review = mongoose.model("Review", reviewSchema);
