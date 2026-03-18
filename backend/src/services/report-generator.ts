import { eq, and, gte, lte, sql } from "drizzle-orm";
import { generateMessage } from "../config/claude.js";
import { db } from "../config/database.js";
import { healthEvents, weeklyReports, notificationLog, users } from "../db/schema.js";
import { getUserFcmToken, deliverNotification } from "./notification.service.js";

interface WeeklyMetrics {
  avgHeartRate: number | null;
  avgHrv: number | null;
  totalSteps: number | null;
  avgSleepHours: number | null;
  workoutCount: number;
  notificationCount: number;
  eventsByType: Record<string, number>;
}

const WEEKLY_REPORT_SYSTEM_PROMPT = `You are VitalAI, a friendly health coach writing a weekly health summary for your client.
Write in Portuguese (BR), conversational tone, like a personal coach talking to a friend.
Structure: 1) Overall assessment (1 sentence), 2) Sleep analysis, 3) Activity summary, 4) Heart health, 5) One actionable tip for next week.
Keep it under 300 words. Be encouraging but honest. Use data provided.`;

export async function generateWeeklyReport(userId: string): Promise<string> {
  const now = new Date();
  const weekStart = getStartOfWeek(now);
  const weekEnd = getEndOfWeek(now);

  // Aggregate metrics from health_events
  const metrics = await aggregateWeeklyMetrics(userId, weekStart, weekEnd);

  // Generate report text via Claude
  let reportText: string;
  try {
    reportText = await generateMessage(
      WEEKLY_REPORT_SYSTEM_PROMPT,
      JSON.stringify(metrics),
    );
  } catch {
    reportText = buildFallbackReport(metrics);
  }

  // Store report
  const [report] = await db.insert(weeklyReports).values({
    userId,
    weekStart,
    weekEnd,
    metrics: metrics as unknown as Record<string, unknown>,
    reportText,
  }).returning();

  // Send push notification
  const fcmToken = await getUserFcmToken(userId);
  if (fcmToken) {
    await deliverNotification({
      userId,
      fcmToken,
      title: "Relatório Semanal",
      body: "Seu resumo da semana está pronto! Confira agora.",
      data: { type: "weekly_report", reportId: report.id },
    });
  }

  return reportText;
}

export async function generateReportsForAllUsers(): Promise<number> {
  const allUsers = await db.select({ id: users.id }).from(users);
  let count = 0;

  for (const user of allUsers) {
    try {
      await generateWeeklyReport(user.id);
      count++;
    } catch (error) {
      console.error(`[ReportGenerator] Failed for user ${user.id}:`, error);
    }
  }

  return count;
}

async function aggregateWeeklyMetrics(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<WeeklyMetrics> {
  const events = await db
    .select()
    .from(healthEvents)
    .where(
      and(
        eq(healthEvents.userId, userId),
        gte(healthEvents.createdAt, weekStart),
        lte(healthEvents.createdAt, weekEnd),
      ),
    );

  // Count events by type
  const eventsByType: Record<string, number> = {};
  for (const event of events) {
    eventsByType[event.triggerType] = (eventsByType[event.triggerType] ?? 0) + 1;
  }

  // Extract metrics from payloads
  const hrValues: number[] = [];
  const hrvValues: number[] = [];
  const sleepValues: number[] = [];
  let workoutCount = 0;

  for (const event of events) {
    const payload = event.payload as Record<string, unknown>;

    if (event.triggerType === "high_heart_rate" && typeof payload.currentBPM === "number") {
      hrValues.push(payload.currentBPM);
    }
    if (event.triggerType === "low_hrv" && typeof payload.currentHRV === "number") {
      hrvValues.push(payload.currentHRV);
    }
    if (event.triggerType === "morning_sleep" && typeof payload.hours === "number") {
      sleepValues.push(payload.hours);
    }
    if (event.triggerType === "post_workout") {
      workoutCount++;
    }
  }

  // Count notifications delivered this week
  const notifications = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.userId, userId),
        eq(notificationLog.delivered, true),
        gte(notificationLog.createdAt, weekStart),
        lte(notificationLog.createdAt, weekEnd),
      ),
    );

  return {
    avgHeartRate: hrValues.length > 0 ? Math.round(average(hrValues)) : null,
    avgHrv: hrvValues.length > 0 ? Math.round(average(hrvValues)) : null,
    totalSteps: null, // Steps aggregation would come from HealthKit directly
    avgSleepHours: sleepValues.length > 0 ? Math.round(average(sleepValues) * 10) / 10 : null,
    workoutCount,
    notificationCount: notifications[0]?.count ?? 0,
    eventsByType,
  };
}

function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function buildFallbackReport(metrics: WeeklyMetrics): string {
  const parts: string[] = [];
  parts.push("Aqui está o resumo da sua semana de saúde.");

  if (metrics.avgSleepHours !== null) {
    parts.push(`Você dormiu em média ${metrics.avgSleepHours} horas por noite.`);
  }

  if (metrics.workoutCount > 0) {
    parts.push(`Foram ${metrics.workoutCount} treino${metrics.workoutCount > 1 ? "s" : ""} registrado${metrics.workoutCount > 1 ? "s" : ""} esta semana.`);
  }

  if (metrics.avgHeartRate !== null) {
    parts.push(`Sua frequência cardíaca média foi de ${metrics.avgHeartRate} bpm.`);
  }

  parts.push("Continue assim! Na próxima semana, tente manter a consistência nos seus hábitos.");

  return parts.join(" ");
}
