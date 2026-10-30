import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

let io: Server | null = null;

export function initIo(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
    path: "/realtime",
  });
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers.cookie || "")
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("eh_access="))
        ?.split("=")[1];
    if (!token) return next();
    try {
      const decoded = jwt.verify(token, env.jwtSecret) as { sub: string };
      socket.data.userId = decoded.sub;
      next();
    } catch {
      next();
    }
  });
  io.on("connection", (socket) => {
    if (socket.data.userId) socket.join(`user:${socket.data.userId}`);
    socket.on("join-conversation", (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
    });
  });
  return io;
}

export function getIo() {
  return io;
}
