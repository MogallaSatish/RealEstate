import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter: nodemailer.Transporter | null = null;

function getTransport() {
  if (transporter) return transporter;
  if (!env.smtp.host) return null;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string) {
  const t = getTransport();
  if (!t) {
    console.info(`[mail:dev] to=${to} subject=${subject}`);
    return { queued: false, preview: true };
  }
  await t.sendMail({ from: env.smtp.from, to, subject, html });
  return { queued: true };
}
