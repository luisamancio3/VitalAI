import cron from "node-cron";
import { generateReportsForAllUsers } from "./services/report-generator.js";

export function startScheduler() {
  // Weekly report: every Sunday at 3:00 AM (São Paulo timezone)
  cron.schedule("0 3 * * 0", async () => {
    console.log("[Scheduler] Starting weekly report generation...");
    const start = Date.now();

    try {
      const count = await generateReportsForAllUsers();
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[Scheduler] Weekly reports done: ${count} reports in ${elapsed}s`);
    } catch (error) {
      console.error("[Scheduler] Weekly report generation failed:", error);
    }
  }, {
    timezone: "America/Sao_Paulo",
  });

  console.log("[Scheduler] Cron jobs registered (weekly report: Sun 3:00 AM BRT)");
}
