import crypto from "crypto";
import QRCode from "qrcode";
import { env } from "../config/env.js";
import { paiseToRupees } from "../utils/money.js";

export function createMerchantRef() {
  return `EH${Date.now()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function buildUpiUri(opts: { amountPaise: number; merchantRef: string; note: string }) {
  const am = paiseToRupees(opts.amountPaise).toFixed(2);
  const params = new URLSearchParams({
    pa: env.upi.merchantVpa,
    pn: env.upi.merchantName,
    am,
    cu: "INR",
    tn: opts.note,
    tr: opts.merchantRef,
  });
  return `upi://pay?${params.toString()}`;
}

export async function buildQr(upiUri: string) {
  return QRCode.toDataURL(upiUri, { margin: 1, width: 280 });
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!env.upi.webhookSecret) return false;
  const expected = crypto.createHmac("sha256", env.upi.webhookSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export const upiApps = ["Google Pay", "PhonePe", "Paytm UPI", "BHIM UPI", "Other UPI app"];
