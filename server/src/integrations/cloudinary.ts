import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

export function cloudinaryConfigured() {
  return Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
}

if (cloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

export async function uploadBuffer(buffer: Buffer, folder: string, resourceType: "image" | "raw" = "image") {
  if (!cloudinaryConfigured()) {
    const fakeId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return {
      url: `https://placehold.co/1200x800/0B1F3A/C9A227?text=EstateHub`,
      publicId: fakeId,
      sandbox: true as const,
    };
  }
  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, quality: "auto", fetch_format: "auto" },
      (error, uploaded) => {
        if (error || !uploaded) reject(error);
        else resolve({ secure_url: uploaded.secure_url, public_id: uploaded.public_id });
      },
    );
    stream.end(buffer);
  });
  return { url: result.secure_url, publicId: result.public_id, sandbox: false as const };
}

export async function destroyAsset(publicId: string) {
  if (!cloudinaryConfigured() || publicId.startsWith("local-")) return;
  await cloudinary.uploader.destroy(publicId);
}
