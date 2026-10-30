import mongoose, { Schema } from "mongoose";
import {
  APPROVAL_STATUS,
  AVAILABILITY,
  FACING,
  FURNISHING,
  LISTING_TYPES,
  OWNERSHIP_TYPES,
  PROPERTY_PURPOSES,
  PROPERTY_STATUS,
  PROPERTY_TYPES,
  VERIFICATION_STATUS,
} from "../types/enums.js";

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    isCover: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    kind: { type: String, enum: ["photo", "floorplan", "document"], default: "photo" },
  },
  { _id: true },
);

const propertySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    propertyType: { type: String, enum: PROPERTY_TYPES, required: true },
    purpose: { type: String, enum: PROPERTY_PURPOSES, required: true },
    listingType: { type: String, enum: LISTING_TYPES, required: true },
    ownershipType: { type: String, enum: OWNERSHIP_TYPES, default: "freehold" },
    location: {
      country: { type: String, default: "India" },
      state: { type: String, required: true },
      city: { type: String, required: true, index: true },
      locality: { type: String, required: true },
      street: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      lat: { type: Number },
      lng: { type: Number },
      hideExactAddress: { type: Boolean, default: true },
    },
    specs: {
      bedrooms: { type: Number, default: 0 },
      bathrooms: { type: Number, default: 0 },
      balconies: { type: Number, default: 0 },
      builtUpAreaSqft: { type: Number, default: 0 },
      carpetAreaSqft: { type: Number, default: 0 },
      plotAreaSqft: { type: Number, default: 0 },
      floorNumber: { type: Number, default: 0 },
      totalFloors: { type: Number, default: 0 },
      facing: { type: String, enum: FACING },
      propertyAgeYears: { type: Number, default: 0 },
      furnishing: { type: String, enum: FURNISHING, default: "unfurnished" },
      parking: { type: Number, default: 0 },
      availability: { type: String, enum: AVAILABILITY, default: "available" },
    },
    pricing: {
      currency: { type: String, default: "INR" },
      salePricePaise: { type: Number, default: 0 },
      monthlyRentPaise: { type: Number, default: 0 },
      securityDepositPaise: { type: Number, default: 0 },
      leaseAmountPaise: { type: Number, default: 0 },
      maintenancePaise: { type: Number, default: 0 },
      negotiable: { type: Boolean, default: true },
    },
    amenities: { type: [String], default: [] },
    images: { type: [imageSchema], default: [] },
    videoUrl: { type: String, default: "" },
    availabilityDate: Date,
    contactOverride: {
      name: String,
      mobile: String,
      email: String,
    },
    listedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    listedByRole: { type: String, enum: ["owner", "agent", "admin"], required: true },
    agencyId: { type: Schema.Types.ObjectId, ref: "Agency" },
    status: { type: String, enum: PROPERTY_STATUS, default: "draft", index: true },
    approvalStatus: { type: String, enum: APPROVAL_STATUS, default: "pending", index: true },
    verificationStatus: { type: String, enum: VERIFICATION_STATUS, default: "not_submitted" },
    verificationNote: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },
    featuredUntil: Date,
    isPremium: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    inquiryCount: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false },
    documents: [
      {
        url: String,
        publicId: String,
        label: String,
        kind: { type: String, default: "support" },
      },
    ],
  },
  { timestamps: true },
);

propertySchema.index({
  title: "text",
  description: "text",
  "location.locality": "text",
  "location.city": "text",
});
propertySchema.index({ purpose: 1, "location.city": 1, approvalStatus: 1, status: 1 });
propertySchema.index({ propertyType: 1, purpose: 1 });
propertySchema.index({ featuredUntil: -1 });
propertySchema.index({ createdAt: -1 });
propertySchema.index({ "pricing.salePricePaise": 1 });
propertySchema.index({ "pricing.monthlyRentPaise": 1 });

export const Property = mongoose.model("Property", propertySchema);
