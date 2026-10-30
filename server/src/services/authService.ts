import crypto from "crypto";
import bcrypt from "bcryptjs";
import { EmailVerificationToken } from "../models/EmailVerificationToken.js";
import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { User } from "../models/User.js";
import { UserProfile } from "../models/UserProfile.js";
import { AgentProfile } from "../models/AgentProfile.js";
import { sendMail } from "../integrations/mailer.js";
import { env } from "../config/env.js";
import { badRequest, unauthorized, conflict } from "../utils/errors.js";
import { writeAudit } from "./audit.js";

const SALT = 12;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function registerUser(input: {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  role: "buyer" | "tenant" | "owner" | "agent";
}) {
  const exists = await User.findOne({
    $or: [{ email: input.email.toLowerCase() }, { mobile: input.mobile }],
  }).lean();
  if (exists) throw conflict("An account with this email or mobile already exists");
  const passwordHash = await bcrypt.hash(input.password, SALT);
  const user = await User.create({
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    mobile: input.mobile,
    passwordHash,
    role: input.role,
    emailVerified: env.nodeEnv === "development",
  });
  await UserProfile.create({ userId: user._id });
  if (input.role === "agent") {
    await AgentProfile.create({ userId: user._id, serviceAreas: ["Vijayawada"] });
  }
  const token = crypto.randomBytes(32).toString("hex");
  await EmailVerificationToken.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
  });
  await sendMail(
    user.email,
    "Verify your EstateHub email",
    `<p>Welcome to EstateHub.</p><p><a href="${env.clientUrl}/verify-email?token=${token}">Verify email</a></p>`,
  );
  await writeAudit({ actorId: String(user._id), action: "user.register", entity: "User", entityId: String(user._id) });
  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user) throw unauthorized("Invalid email or password");
  if (user.status === "suspended") throw unauthorized("This account is suspended");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized("Invalid email or password");
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

export async function verifyEmail(token: string) {
  const tokenHash = hashToken(token);
  const row = await EmailVerificationToken.findOne({ tokenHash, used: false, expiresAt: { $gt: new Date() } });
  if (!row) throw badRequest("Invalid or expired verification token");
  await User.findByIdAndUpdate(row.userId, { emailVerified: true });
  row.used = true;
  await row.save();
}

export async function requestPasswordReset(email: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  if (!user) return;
  const token = crypto.randomBytes(32).toString("hex");
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 30),
  });
  await sendMail(
    user.email,
    "Reset your EstateHub password",
    `<p><a href="${env.clientUrl}/reset-password?token=${token}">Reset password</a> (valid 30 minutes)</p>`,
  );
}

export async function resetPassword(token: string, password: string) {
  const row = await PasswordResetToken.findOne({
    tokenHash: hashToken(token),
    used: false,
    expiresAt: { $gt: new Date() },
  });
  if (!row) throw badRequest("Invalid or expired reset token");
  const passwordHash = await bcrypt.hash(password, SALT);
  await User.findByIdAndUpdate(row.userId, { passwordHash });
  row.used = true;
  await row.save();
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw unauthorized();
  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) throw badRequest("Current password is incorrect");
  user.passwordHash = await bcrypt.hash(next, SALT);
  await user.save();
}

export function publicUser(user: {
  _id: unknown;
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  status: string;
  emailVerified: boolean;
  avatarUrl?: string;
  identityVerified?: boolean;
}) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl ?? "",
    identityVerified: user.identityVerified ?? false,
  };
}
