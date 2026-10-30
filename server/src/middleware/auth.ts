import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { UserRole } from "../types/enums.js";
import { forbidden, unauthorized } from "../utils/errors.js";

interface TokenPayload {
  sub: string;
  role: UserRole;
  email: string;
  typ: "access" | "refresh";
}

export function signAccess(payload: Omit<TokenPayload, "typ">) {
  return jwt.sign({ ...payload, typ: "access" }, env.jwtSecret, { expiresIn: "15m" });
}

export function signRefresh(payload: Omit<TokenPayload, "typ">) {
  return jwt.sign({ ...payload, typ: "refresh" }, env.jwtRefreshSecret, { expiresIn: "7d" });
}

export function setAuthCookies(res: Response, access: string, refresh: string) {
  const base = {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? ("none" as const) : ("lax" as const),
    path: "/",
  };
  res.cookie("eh_access", access, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie("eh_refresh", refresh, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("eh_access", { path: "/" });
  res.clearCookie("eh_refresh", { path: "/" });
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    attachUser(req);
  } catch {
    /* guests allowed */
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    attachUser(req);
    if (!req.user) throw unauthorized();
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

function attachUser(req: Request) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token = bearer || req.cookies?.eh_access;
  if (!token) return;
  const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
  if (decoded.typ !== "access") throw unauthorized("Invalid token type");
  req.user = { id: decoded.sub, role: decoded.role, email: decoded.email };
}

export function verifyRefresh(token: string) {
  const decoded = jwt.verify(token, env.jwtRefreshSecret) as TokenPayload;
  if (decoded.typ !== "refresh") throw unauthorized("Invalid refresh token");
  return decoded;
}
