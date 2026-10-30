import mongoose, { Schema } from "mongoose";
import { AMENITY_KEYS } from "../types/enums.js";

const amenitySchema = new Schema(
  {
    key: { type: String, enum: AMENITY_KEYS, unique: true, required: true },
    name: { type: String, required: true },
    category: { type: String, default: "general" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Amenity = mongoose.model("Amenity", amenitySchema);
