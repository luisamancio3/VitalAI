import { eq, and, gte, desc, sql } from "drizzle-orm";
import { db } from "../config/database.js";
import { hydrationLogs, users, healthEvents } from "../db/schema.js";
import { processEvent } from "./trigger-processor.js";

const DEFAULT_DAILY_GOAL_ML = 2500;
const BASE_INTERVAL_MINUTES = 90;
const MIN_INTERVAL_MINUTES = 45;
const MAX_INTERVAL_MINUTES = 150;

interface HydrationStatus {
  todayTotalMl: number;
  goalMl: number;
  progress: number;
  lastIntakeAt: string | null;
  nextReminderIn: number | null;
  logs: HydrationLogEntry[];
}

interface HydrationLogEntry {
  id: string;
  amountMl: number;
  source: string;
  createdAt: Date;
}

interface SmartIntervalFactors {
  minutesSinceLastIntake: number;
  recentWorkout: boolean;
  currentHour: number;
  todayProgress: number;
}

export function calculateSmartInterval(factors: SmartIntervalFactors): number {
  let interval = BASE_INTERVAL_MINUTES;

  // Post-workout: remind sooner (halve the interval)
  if (factors.recentWorkout) {
    interval *= 0.5;
  }

  // Hot hours (10am-4pm): reduce interval by 20%
  if (factors.currentHour >= 10 && factors.currentHour <= 16) {
    interval *= 0.8;
  }

  // If behind on daily goal (< 50% by afternoon), remind more often
  if (factors.currentHour >= 14 && factors.todayProgress < 0.5) {
    interval *= 0.7;
  }

  // If already ahead of schedule (> 80%), relax reminders
  if (factors.todayProgress >= 0.8) {
    interval *= 1.5;
  }

  return Math.max(MIN_INTERVAL_MINUTES, Math.min(MAX_INTERVAL_MINUTES, Math.round(interval)));
}

export async function logWaterIntake(
  userId: string,
  amountMl: number,
  source: string = "manual",
): Promise<{ id: string; todayTotalMl: number }> {
  const [inserted] = await db
    .insert(hydrationLogs)
    .values({ userId, amountMl, source })
    .returning();

  const todayTotalMl = await getTodayTotalMl(userId);
  return { id: inserted.id, todayTotalMl };
}

export async function getTodayTotalMl(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const result = await db
    .select({ total: sql<number>`coalesce(sum(${hydrationLogs.amountMl}), 0)::int` })
    .from(hydrationLogs)
    .where(
      and(
        eq(hydrationLogs.userId, userId),
        gte(hydrationLogs.createdAt, startOfDay),
      ),
    );

  return result[0]?.total ?? 0;
}

export async function getHydrationStatus(userId: string): Promise<HydrationStatus> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const logs = await db
    .select({
      id: hydrationLogs.id,
      amountMl: hydrationLogs.amountMl,
      source: hydrationLogs.source,
      createdAt: hydrationLogs.createdAt,
    })
    .from(hydrationLogs)
    .where(
      and(
        eq(hydrationLogs.userId, userId),
        gte(hydrationLogs.createdAt, startOfDay),
      ),
    )
    .orderBy(desc(hydrationLogs.createdAt))
    .limit(50);

  // Sum the full day in SQL, not the capped 50-row display list, so heavy
  // loggers (many quick-adds) aren't undercounted.
  const todayTotalMl = await getTodayTotalMl(userId);
  const goalMl = DEFAULT_DAILY_GOAL_ML;
  const progress = Math.min(todayTotalMl / goalMl, 1.0);

  const lastLog = logs[0];
  const lastIntakeAt = lastLog?.createdAt?.toISOString() ?? null;

  const minutesSinceLastIntake = lastLog?.createdAt
    ? (Date.now() - new Date(lastLog.createdAt).getTime()) / 60000
    : 999;

  const recentWorkout = await hadRecentWorkout(userId);
  const currentHour = new Date().getHours();

  const interval = calculateSmartInterval({
    minutesSinceLastIntake,
    recentWorkout,
    currentHour,
    todayProgress: progress,
  });

  // Countdown until the next reminder is due, not the raw interval — a client
  // showing "próximo lembrete em X min" needs time remaining. 0 = due now.
  const nextReminderIn = lastLog
    ? Math.max(0, Math.round(interval - minutesSinceLastIntake))
    : 0;

  return {
    todayTotalMl,
    goalMl,
    progress,
    lastIntakeAt,
    nextReminderIn,
    logs: logs as HydrationLogEntry[],
  };
}

async function hadRecentWorkout(userId: string): Promise<boolean> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const results = await db
    .select({ id: healthEvents.id })
    .from(healthEvents)
    .where(
      and(
        eq(healthEvents.userId, userId),
        eq(healthEvents.triggerType, "post_workout"),
        gte(healthEvents.createdAt, twoHoursAgo),
      ),
    )
    .limit(1);

  return results.length > 0;
}

export async function checkHydrationForAllUsers(): Promise<number> {
  const allUsers = await db
    .select({ id: users.id })
    .from(users);

  let sent = 0;
  const currentHour = new Date().getHours();

  // Only send during waking hours (7am-10pm)
  if (currentHour < 7 || currentHour >= 22) return 0;

  for (const user of allUsers) {
    try {
      const status = await getHydrationStatus(user.id);
      if (shouldSendReminder(status, currentHour)) {
        await processEvent({
          userId: user.id,
          triggerType: "hydration_reminder",
          payload: {
            todayTotalMl: status.todayTotalMl,
            goalMl: status.goalMl,
            progress: Math.round(status.progress * 100),
            minutesSinceLastIntake: status.lastIntakeAt
              ? Math.round((Date.now() - new Date(status.lastIntakeAt).getTime()) / 60000)
              : null,
          },
          timestamp: new Date().toISOString(),
        });
        sent++;
      }
    } catch (error) {
      console.warn(`[Hydration] Failed check for user ${user.id}:`, error);
    }
  }

  return sent;
}

/**
 * Pure reminder decision from a computed status. Exported for testing and to
 * keep checkHydrationForAllUsers to a single status query per user.
 */
export function shouldSendReminder(status: HydrationStatus, currentHour: number): boolean {
  // Already met goal — no reminder needed
  if (status.progress >= 1.0) return false;

  // No intake logged today — remind once the morning is underway
  if (!status.lastIntakeAt) return currentHour >= 9;

  // nextReminderIn is the countdown to the next reminder; 0 means it's due
  return (status.nextReminderIn ?? 0) <= 0;
}

export async function getHydrationHistory(userId: string, days: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const results = await db
    .select({
      date: sql<string>`date(${hydrationLogs.createdAt})`,
      totalMl: sql<number>`sum(${hydrationLogs.amountMl})::int`,
      logCount: sql<number>`count(*)::int`,
    })
    .from(hydrationLogs)
    .where(
      and(
        eq(hydrationLogs.userId, userId),
        gte(hydrationLogs.createdAt, since),
      ),
    )
    .groupBy(sql`date(${hydrationLogs.createdAt})`)
    .orderBy(sql`date(${hydrationLogs.createdAt}) desc`);

  return results;
}
