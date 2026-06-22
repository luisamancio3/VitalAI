import cron from "node-cron";
import { generateReportsForAllUsers } from "./services/report-generator.js";
import { checkMealRoutines } from "./services/meal-routine.service.js";

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

  // Meal routine check: every 30 minutes during waking hours (6 AM - 10 PM)
  cron.schedule("0,30 6-22 * * *", async () => {
    try {
      const count = await checkMealRoutines();
      if (count > 0) {
        console.log(`[Scheduler] Meal routine prompts sent: ${count}`);
      }
    } catch (error) {
      console.error("[Scheduler] Meal routine check failed:", error);
    }
  }, {
    timezone: "America/Sao_Paulo",
  });

  console.log("[Scheduler] Cron jobs registered (weekly report: Sun 3:00 AM BRT, meal routine: every 30min 6-22h BRT)");
}
