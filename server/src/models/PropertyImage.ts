import mongoose, { Schema } from "mongoose";

const propertyImageSchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    isCover: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    kind: { type: String, default: "photo" },
  },
  { timestamps: true },
);

export const PropertyImage = mongoose.model("PropertyImage", propertyImageSchema);
