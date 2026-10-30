import { expireStalePayments } from "../services/paymentService.js";

export function startJobs() {
  setInterval(() => {
    expireStalePayments().catch((err) => console.error("expire payments", err));
  }, 5 * 60 * 1000);
}
