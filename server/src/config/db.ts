import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDb() {
  if (!env.mongoUri) {
    throw new Error(
      "MONGODB_URI is not set. Create a MongoDB Atlas cluster and put the connection string in server/.env",
    );
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 12000,
    maxPoolSize: 10,
  });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

export function dbState() {
  const map = ["disconnected", "connected", "connecting", "disconnecting"] as const;
  return map[mongoose.connection.readyState] ?? "unknown";
}
