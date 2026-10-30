import mongoose, { Schema } from "mongoose";

const propertyAmenitySchema = new Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    amenityId: { type: Schema.Types.ObjectId, ref: "Amenity", required: true },
  },
  { timestamps: true },
);

propertyAmenitySchema.index({ propertyId: 1, amenityId: 1 }, { unique: true });

export const PropertyAmenity = mongoose.model("PropertyAmenity", propertyAmenitySchema);
