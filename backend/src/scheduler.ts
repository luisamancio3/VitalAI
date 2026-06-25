import cron from "node-cron";
import { generateReportsForAllUsers } from "./services/report-generator.js";
import { checkMealRoutines } from "./services/meal-routine.service.js";
import { generateMonthlyReportsForAllUsers } from "./services/monthly-report.service.js";
import { checkHydrationForAllUsers } from "./services/hydration.service.js";

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

  // Monthly report: 1st of each month at 4:00 AM (São Paulo timezone)
  cron.schedule("0 4 1 * *", async () => {
    console.log("[Scheduler] Starting monthly report generation...");
    const start = Date.now();

    try {
      const count = await generateMonthlyReportsForAllUsers();
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[Scheduler] Monthly reports done: ${count} reports in ${elapsed}s`);
    } catch (error) {
      console.error("[Scheduler] Monthly report generation failed:", error);
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

  // Hydration check: every 45 minutes during waking hours (7 AM - 10 PM)
  cron.schedule("0,45 7-21 * * *", async () => {
    try {
      const count = await checkHydrationForAllUsers();
      if (count > 0) {
        console.log(`[Scheduler] Hydration reminders sent: ${count}`);
      }
    } catch (error) {
      console.error("[Scheduler] Hydration check failed:", error);
    }
  }, {
    timezone: "America/Sao_Paulo",
  });

  console.log("[Scheduler] Cron jobs registered (weekly: Sun 3AM, monthly: 1st 4AM, meals: 30min 6-22h, hydration: 45min 7-22h BRT)");
}
