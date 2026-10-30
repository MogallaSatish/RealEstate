import mongoose, { Schema } from "mongoose";

const favoriteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    collectionName: { type: String, default: "Saved" },
  },
  { timestamps: true },
);

favoriteSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

export const Favorite = mongoose.model("Favorite", favoriteSchema);
