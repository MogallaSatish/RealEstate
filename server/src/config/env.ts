import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function requiredInProd(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (process.env.NODE_ENV === "production" && !process.env[name]) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value ?? "";
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  mongoUri: process.env.MONGODB_URI ?? "",
  jwtSecret: requiredInProd("JWT_SECRET", "dev-jwt-secret-change-me"),
  jwtRefreshSecret: requiredInProd("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  serverUrl: process.env.SERVER_URL ?? "http://localhost:5000",
  cookieSecure: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "EstateHub <no-reply@estatehub.in>",
  },
  googleMapsKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
  upi: {
    sandbox: process.env.UPI_SANDBOX !== "false",
    sandboxConfirmKey: process.env.SANDBOX_CONFIRM_KEY ?? "dev-sandbox-confirm",
    merchantId: process.env.UPI_MERCHANT_ID ?? "SANDBOX",
    merchantVpa: process.env.UPI_MERCHANT_VPA ?? "estatehub@upi",
    merchantName: process.env.UPI_MERCHANT_NAME ?? "EstateHub",
    apiKey: process.env.UPI_PROVIDER_API_KEY ?? "",
    apiSecret: process.env.UPI_PROVIDER_API_SECRET ?? "",
    webhookSecret: process.env.UPI_WEBHOOK_SECRET ?? "",
  },
};

export const isProd = env.nodeEnv === "production";
