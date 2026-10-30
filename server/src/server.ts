import http from "http";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { initIo } from "./realtime/io.js";
import { startJobs } from "./jobs/expirePayments.js";

async function main() {
  await connectDb();
  const app = createApp();
  const server = http.createServer(app);
  initIo(server);
  startJobs();
  server.listen(env.port, () => {
    console.log(`EstateHub API listening on ${env.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
