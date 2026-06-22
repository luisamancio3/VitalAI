import { eq } from "drizzle-orm";
import { redis, db } from "../config/database.js";
import { users, nutritionProfiles } from "../db/schema.js";
import { processEvent } from "./trigger-processor.js";

interface MealWindow {
  name: string;
  context: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

const DEFAULT_MEAL_WINDOWS: MealWindow[] = [
  { name: "café da manhã", context: "breakfast", startHour: 7, startMinute: 0, endHour: 9, endMinute: 0 },
  { name: "almoço", context: "lunch", startHour: 11, startMinute: 30, endHour: 13, endMinute: 0 },
  { name: "jantar", context: "dinner", startHour: 19, startMinute: 0, endHour: 21, endMinute: 0 },
];

export function getCurrentMealWindow(hour: number, minute: number): MealWindow | null {
  for (const window of DEFAULT_MEAL_WINDOWS) {
    const currentMinutes = hour * 60 + minute;
    const startMinutes = window.startHour * 60 + window.startMinute;
    const endMinutes = window.endHour * 60 + window.endMinute;

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return window;
    }
  }
  return null;
}

export async function checkMealRoutines(): Promise<number> {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  const mealWindow = getCurrentMealWindow(hour, minute);
  if (!mealWindow) return 0;

  const usersWithProfiles = await db
    .select({ userId: nutritionProfiles.userId })
    .from(nutritionProfiles);

  let prompted = 0;

  for (const { userId } of usersWithProfiles) {
    try {
      const todayKey = `meal_routine:${userId}:${mealWindow.context}:${toDateString(now)}`;
      const alreadyPrompted = await redis.get(todayKey);
      if (alreadyPrompted) continue;

      const result = await processEvent({
        userId,
        triggerType: "meal_detected",
        payload: {
          source: "routine",
          mealWindow: mealWindow.context,
          mealName: mealWindow.name,
        },
        timestamp: now.toISOString(),
      });

      if (result.processed) {
        // Mark this meal window as prompted for today (expires at midnight + 1h buffer)
        const secondsUntilTomorrow = getSecondsUntilTomorrow(now);
        await redis.setex(todayKey, secondsUntilTomorrow, "1");
        prompted++;
      }
    } catch (error) {
      console.error(`[MealRoutine] Failed for user ${userId}:`, error);
    }
  }

  return prompted;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getSecondsUntilTomorrow(now: Date): number {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(1, 0, 0, 0);
  return Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
}
