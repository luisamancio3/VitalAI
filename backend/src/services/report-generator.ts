import { eq, and, gte, lte, sql } from "drizzle-orm";
import { generateMessage } from "../config/claude.js";
import { db } from "../config/database.js";
import { healthEvents, weeklyReports, notificationLog, mealFeedback, users } from "../db/schema.js";
import { getUserFcmToken, deliverNotification } from "./notification.service.js";

interface NutritionMetrics {
  mealsLogged: number;
  avgRating: number | null;
  topContext: string | null;
}

interface WeekComparison {
  sleepDelta: number | null;
  workoutDelta: number | null;
  mealsDelta: number | null;
  trend: "improving" | "stable" | "declining";
}

interface WeeklyMetrics {
  avgHeartRate: number | null;
  avgHrv: number | null;
  totalSteps: number | null;
  avgSleepHours: number | null;
  workoutCount: number;
  notificationCount: number;
  eventsByType: Record<string, number>;
  nutrition: NutritionMetrics;
  comparison: WeekComparison | null;
}

const WEEKLY_REPORT_SYSTEM_PROMPT = `You are VitalAI, a friendly health coach writing a weekly health summary for your client.
Write in Portuguese (BR), conversational tone, like a personal coach talking to a friend.
Structure: 1) Overall assessment (1 sentence), 2) Sleep analysis, 3) Activity summary, 4) Heart health, 5) Nutrition summary (meals logged, average satisfaction), 6) Week-over-week comparison if available, 7) One actionable tip for next week.
Keep it under 400 words. Be encouraging but honest. Use data provided. If comparison data shows improvement, celebrate it. If declining, suggest one specific fix.`;

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

  // Nutrition: meal feedback this week
  const nutrition = await aggregateNutritionMetrics(userId, weekStart, weekEnd);

  // Week-over-week comparison
  const comparison = await compareWithPreviousWeek(userId, weekStart, {
    avgSleepHours: sleepValues.length > 0 ? Math.round(average(sleepValues) * 10) / 10 : null,
    workoutCount,
    mealsLogged: nutrition.mealsLogged,
  });

  return {
    avgHeartRate: hrValues.length > 0 ? Math.round(average(hrValues)) : null,
    avgHrv: hrvValues.length > 0 ? Math.round(average(hrvValues)) : null,
    totalSteps: null, // Steps aggregation would come from HealthKit directly
    avgSleepHours: sleepValues.length > 0 ? Math.round(average(sleepValues) * 10) / 10 : null,
    workoutCount,
    notificationCount: notifications[0]?.count ?? 0,
    eventsByType,
    nutrition,
    comparison,
  };
}

async function aggregateNutritionMetrics(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<NutritionMetrics> {
  const feedback = await db
    .select()
    .from(mealFeedback)
    .where(
      and(
        eq(mealFeedback.userId, userId),
        gte(mealFeedback.createdAt, weekStart),
        lte(mealFeedback.createdAt, weekEnd),
      ),
    );

  if (feedback.length === 0) {
    return { mealsLogged: 0, avgRating: null, topContext: null };
  }

  const ratings = feedback.map((f) => f.rating);
  const avgRating = Math.round(average(ratings) * 10) / 10;

  // Find most common context
  const contextCounts: Record<string, number> = {};
  for (const f of feedback) {
    if (f.context) {
      contextCounts[f.context] = (contextCounts[f.context] ?? 0) + 1;
    }
  }
  const topContext = Object.entries(contextCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { mealsLogged: feedback.length, avgRating, topContext };
}

async function compareWithPreviousWeek(
  userId: string,
  currentWeekStart: Date,
  currentMetrics: { avgSleepHours: number | null; workoutCount: number; mealsLogged: number },
): Promise<WeekComparison | null> {
  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(currentWeekStart);
  prevWeekEnd.setMilliseconds(-1);

  const [prevReport] = await db
    .select({ metrics: weeklyReports.metrics })
    .from(weeklyReports)
    .where(
      and(
        eq(weeklyReports.userId, userId),
        gte(weeklyReports.weekStart, prevWeekStart),
        lte(weeklyReports.weekStart, prevWeekEnd),
      ),
    )
    .limit(1);

  if (!prevReport?.metrics) return null;

  const prev = prevReport.metrics as Record<string, unknown>;
  const prevSleep = typeof prev.avgSleepHours === "number" ? prev.avgSleepHours : null;
  const prevWorkouts = typeof prev.workoutCount === "number" ? prev.workoutCount : 0;
  const prevNutrition = prev.nutrition as Record<string, unknown> | undefined;
  const prevMeals = typeof prevNutrition?.mealsLogged === "number" ? prevNutrition.mealsLogged : 0;

  const sleepDelta = currentMetrics.avgSleepHours !== null && prevSleep !== null
    ? Math.round((currentMetrics.avgSleepHours - prevSleep) * 10) / 10
    : null;
  const workoutDelta = currentMetrics.workoutCount - prevWorkouts;
  const mealsDelta = currentMetrics.mealsLogged - prevMeals;

  // Simple trend: count positives vs negatives
  let score = 0;
  if (sleepDelta !== null && sleepDelta > 0) score++;
  if (sleepDelta !== null && sleepDelta < 0) score--;
  if (workoutDelta > 0) score++;
  if (workoutDelta < 0) score--;
  if (mealsDelta > 0) score++;
  if (mealsDelta < 0) score--;

  const trend: WeekComparison["trend"] = score > 0 ? "improving" : score < 0 ? "declining" : "stable";

  return { sleepDelta, workoutDelta, mealsDelta, trend };
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

  if (metrics.nutrition.mealsLogged > 0) {
    parts.push(`Você registrou ${metrics.nutrition.mealsLogged} ${metrics.nutrition.mealsLogged > 1 ? "refeições" : "refeição"} com nota média de ${metrics.nutrition.avgRating}.`);
  }

  if (metrics.comparison) {
    if (metrics.comparison.trend === "improving") {
      parts.push("Comparado com a semana passada, seus números estão melhorando!");
    } else if (metrics.comparison.trend === "declining") {
      parts.push("Alguns indicadores caíram em relação à semana passada. Vamos recuperar!");
    } else {
      parts.push("Seus números estão estáveis em relação à semana passada.");
    }
  }

  parts.push("Continue assim! Na próxima semana, tente manter a consistência nos seus hábitos.");

  return parts.join(" ");
}
