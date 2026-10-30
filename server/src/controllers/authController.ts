import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { UserProfile } from "../models/UserProfile.js";
import {
  changePassword,
  loginUser,
  publicUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from "../services/authService.js";
import {
  clearAuthCookies,
  setAuthCookies,
  signAccess,
  signRefresh,
  verifyRefresh,
} from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { unauthorized } from "../utils/errors.js";

function issue(res: Response, user: { _id: unknown; role: string; email: string }) {
  const payload = { sub: String(user._id), role: user.role as never, email: user.email };
  const access = signAccess(payload);
  const refresh = signRefresh(payload);
  setAuthCookies(res, access, refresh);
  return { accessToken: access };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await registerUser(req.body);
  const tokens = issue(res, user);
  res.status(201).json({ user: publicUser(user), ...tokens });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const user = await loginUser(req.body.email, req.body.password);
  const tokens = issue(res, user);
  res.json({ user: publicUser(user), ...tokens });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).lean();
  if (!user) throw unauthorized();
  const profile = await UserProfile.findOne({ userId: user._id }).lean();
  res.json({ user: publicUser(user), profile });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.eh_refresh || req.body.refreshToken;
  if (!token) throw unauthorized();
  const decoded = verifyRefresh(token);
  const user = await User.findById(decoded.sub).lean();
  if (!user || user.status === "suspended") throw unauthorized();
  const tokens = issue(res, user);
  res.json({ user: publicUser(user), ...tokens });
});

export const forgot = asyncHandler(async (req: Request, res: Response) => {
  await requestPasswordReset(req.body.email);
  res.json({ ok: true, message: "If the email exists, a reset link was sent" });
});

export const reset = asyncHandler(async (req: Request, res: Response) => {
  await resetPassword(req.body.token, req.body.password);
  res.json({ ok: true });
});

export const verify = asyncHandler(async (req: Request, res: Response) => {
  await verifyEmail(req.body.token);
  res.json({ ok: true });
});

export const changePass = asyncHandler(async (req: Request, res: Response) => {
  await changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  res.json({ ok: true });
});
