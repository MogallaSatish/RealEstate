import mongoose, { Schema } from "mongoose";

const platformSettingSchema = new Schema(
  {
    key: { type: String, unique: true, default: "default" },
    siteName: { type: String, default: "EstateHub" },
    supportEmail: { type: String, default: "hello@estatehub.in" },
    supportPhone: { type: String, default: "+91 86600 00000" },
    defaultCity: { type: String, default: "Vijayawada" },
    listingsRequireApproval: { type: Boolean, default: true },
    featuredListingPaise: { type: Number, default: 49900 },
    banners: [
      {
        title: String,
        imageUrl: String,
        link: String,
        active: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true },
);

export const PlatformSetting = mongoose.model("PlatformSetting", platformSettingSchema);
