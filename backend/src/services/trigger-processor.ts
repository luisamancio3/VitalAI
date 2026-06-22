import { eq, and, gte, sql } from "drizzle-orm";
import { generateMessage } from "../config/claude.js";
import { redis, db } from "../config/database.js";
import { healthEvents, notificationLog, users } from "../db/schema.js";
import { getUserFcmToken, deliverNotification } from "./notification.service.js";

// Trigger types from the watch/phone classified events
export type TriggerType =
  | "post_workout"
  | "morning_sleep"
  | "low_hrv"
  | "high_heart_rate"
  | "meal_detected"
  | "inactivity"
  | "hydration_reminder";

interface ClassifiedEvent {
  userId: string;
  triggerType: TriggerType;
  payload: Record<string, unknown>;
  timestamp: string;
}

interface ProcessResult {
  processed: boolean;
  message?: string;
  reason?: "cooldown" | "quiet_hours" | "daily_budget" | "error";
}

interface NotificationPreferences {
  quietHoursStart?: number;
  quietHoursEnd?: number;
  dailyBudget?: number;
}

// Cooldown periods per trigger type (in seconds)
const COOLDOWN_MAP: Record<TriggerType, number> = {
  post_workout: 3600, // 1 hour
  morning_sleep: 86400, // 24 hours (once per day)
  low_hrv: 7200, // 2 hours
  high_heart_rate: 1800, // 30 minutes
  meal_detected: 3600, // 1 hour
  inactivity: 7200, // 2 hours
  hydration_reminder: 5400, // 90 minutes
};

export async function processEvent(event: ClassifiedEvent): Promise<ProcessResult> {
  const { userId, triggerType } = event;

  // 1. Check quiet hours
  const userPrefs = await getUserNotificationPreferences(userId);
  const currentHour = new Date().getHours();
  const quietStart = userPrefs.quietHoursStart ?? 22;
  const quietEnd = userPrefs.quietHoursEnd ?? 7;
  if (isInQuietHours(currentHour, quietStart, quietEnd)) {
    return { processed: false, reason: "quiet_hours" };
  }

  // 2. Check daily notification budget
  const todayCount = await getTodayNotificationCount(userId);
  const dailyBudget = userPrefs.dailyBudget ?? 6;
  if (todayCount >= dailyBudget) {
    return { processed: false, reason: "daily_budget" };
  }

  // 3. Atomically check-and-set cooldown via Redis SET NX EX
  const cooldownKey = `cooldown:${userId}:${triggerType}`;
  const cooldownSeconds = COOLDOWN_MAP[triggerType];
  const acquired = await redis.set(cooldownKey, "1", "EX", cooldownSeconds, "NX");
  if (!acquired) return { processed: false, reason: "cooldown" };

  try {
    // Generate personalized message via Claude
    const systemPrompt = buildSystemPrompt(triggerType);
    const userContext = JSON.stringify(event.payload);
    const message = await generateMessage(systemPrompt, userContext);

    // Insert health event into DB
    const [insertedEvent] = await db
      .insert(healthEvents)
      .values({
        userId,
        triggerType,
        payload: event.payload,
        messageGenerated: message,
      })
      .returning();

    // Send push notification
    const fcmToken = await getUserFcmToken(userId);
    if (fcmToken) {
      const title = buildNotificationTitle(triggerType);
      const result = await deliverNotification({
        userId,
        fcmToken,
        title,
        body: message,
      });

      // Log notification
      await db.insert(notificationLog).values({
        userId,
        eventId: insertedEvent.id,
        title,
        body: message,
        fcmMessageId: result.success ? result.messageId : null,
        delivered: result.success,
      });

      // Update health event
      if (result.success) {
        await db
          .update(healthEvents)
          .set({ notificationSent: true })
          .where(eq(healthEvents.id, insertedEvent.id));
      }
    }

    return { processed: true, message };
  } catch (error) {
    console.error(`[TriggerProcessor] Failed to process ${triggerType} for ${userId}:`, error);
    return { processed: false, reason: "error" };
  }
}

function buildNotificationTitle(triggerType: TriggerType): string {
  const titles: Record<TriggerType, string> = {
    morning_sleep: "Resumo do Sono",
    post_workout: "Pós-Treino",
    low_hrv: "Alerta de Estresse",
    high_heart_rate: "Frequência Cardíaca",
    meal_detected: "Refeição Detectada",
    inactivity: "Hora de se Mover",
    hydration_reminder: "Hidratação",
  };
  return titles[triggerType];
}

// --- Fatigue Protection Helpers ---

async function getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const [user] = await db
      .select({ notificationPreferences: users.notificationPreferences })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return (user?.notificationPreferences as NotificationPreferences) ?? {};
  } catch (error) {
    console.warn(`[TriggerProcessor] Failed to fetch preferences for ${userId}:`, error);
    return {};
  }
}

async function getTodayNotificationCount(userId: string): Promise<number> {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationLog)
      .where(
        and(
          eq(notificationLog.userId, userId),
          eq(notificationLog.delivered, true),
          gte(notificationLog.createdAt, startOfDay),
        ),
      );
    return result[0]?.count ?? 0;
  } catch (error) {
    console.warn(`[TriggerProcessor] Failed to count notifications for ${userId}:`, error);
    return 0;
  }
}

export function isInQuietHours(hour: number, start: number, end: number): boolean {
  if (start > end) {
    // Wraps midnight: e.g. 22-7 means 22,23,0,1,2,3,4,5,6
    return hour >= start || hour < end;
  }
  return hour >= start && hour < end;
}

function buildSystemPrompt(triggerType: TriggerType): string {
  const prompts: Record<TriggerType, string> = {
    morning_sleep:
      "You are VitalAI, a friendly health coach. Generate a brief, encouraging morning message about the user's sleep quality. Keep it under 2 sentences. Use Portuguese (BR).",
    post_workout:
      "You are VitalAI, a friendly health coach. Generate a brief post-workout recovery suggestion. Keep it under 2 sentences. Use Portuguese (BR).",
    low_hrv:
      "You are VitalAI, a friendly health coach. The user's HRV is low. Suggest a calming activity. Keep it under 2 sentences. Use Portuguese (BR).",
    high_heart_rate:
      "You are VitalAI, a friendly health coach. The user's heart rate is elevated at rest. Suggest they take a break. Keep it under 2 sentences. Use Portuguese (BR).",
    meal_detected:
      "You are VitalAI, a friendly health coach. It's mealtime for the user. Suggest they take a moment to eat well and mention you have a recipe suggestion ready. Keep it under 2 sentences. Use Portuguese (BR).",
    inactivity:
      "You are VitalAI, a friendly health coach. The user has been inactive for a while. Gently encourage movement. Keep it under 2 sentences. Use Portuguese (BR).",
    hydration_reminder:
      "You are VitalAI, a friendly health coach. Remind the user to drink water. Keep it under 2 sentences. Use Portuguese (BR).",
  };
  return prompts[triggerType];
}
