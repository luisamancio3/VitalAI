import { eq, and, gte, lte } from "drizzle-orm";
import { generateMessage } from "../config/claude.js";
import { db } from "../config/database.js";
import { weeklyReports, monthlyReports, users } from "../db/schema.js";
import { getUserFcmToken, deliverNotification } from "./notification.service.js";

interface MonthlyMetrics {
  weeksIncluded: number;
  avgSleepHours: number | null;
  totalWorkouts: number;
  avgWorkoutsPerWeek: number;
  totalMealsLogged: number;
  avgMealRating: number | null;
  sleepTrend: number[];
  workoutTrend: number[];
  overallTrend: "improving" | "stable" | "declining";
}

const MONTHLY_REPORT_SYSTEM_PROMPT = `You are VitalAI, a friendly health coach writing a monthly health summary for your client.
Write in Portuguese (BR), conversational tone, like a personal coach doing a monthly review with a friend.
Structure: 1) Monthly overview (2-3 sentences), 2) Sleep pattern across the month, 3) Activity consistency, 4) Nutrition habits, 5) Key achievement to celebrate, 6) One goal for next month.
Keep it under 500 words. Focus on patterns and long-term trends rather than individual days. Be encouraging and celebratory of progress.`;

export async function generateMonthlyReport(userId: string): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const reports = await db
    .select()
    .from(weeklyReports)
    .where(
      and(
        eq(weeklyReports.userId, userId),
        gte(weeklyReports.weekStart, monthStart),
        lte(weeklyReports.weekStart, monthEnd),
      ),
    );

  if (reports.length === 0) {
    return "Nenhum relatório semanal disponível este mês. Continue registrando seus dados para receber seu resumo mensal!";
  }

  const metrics = aggregateMonthlyMetrics(reports);

  let reportText: string;
  try {
    reportText = await generateMessage(
      MONTHLY_REPORT_SYSTEM_PROMPT,
      JSON.stringify(metrics),
    );
  } catch {
    reportText = buildFallbackMonthlyReport(metrics);
  }

  await db.insert(monthlyReports).values({
    userId,
    month: monthStart.toISOString().slice(0, 10),
    weeksIncluded: metrics.weeksIncluded,
    metrics: metrics as unknown as Record<string, unknown>,
    reportText,
  }).returning();

  const fcmToken = await getUserFcmToken(userId);
  if (fcmToken) {
    await deliverNotification({
      userId,
      fcmToken,
      title: "Relatório Mensal",
      body: "Seu resumo do mês está pronto! Veja sua evolução.",
      data: { type: "monthly_report" },
    });
  }

  return reportText;
}

export async function generateMonthlyReportsForAllUsers(): Promise<number> {
  const allUsers = await db.select({ id: users.id }).from(users);
  let count = 0;

  for (const user of allUsers) {
    try {
      await generateMonthlyReport(user.id);
      count++;
    } catch (error) {
      console.error(`[MonthlyReport] Failed for user ${user.id}:`, error);
    }
  }

  return count;
}

function aggregateMonthlyMetrics(reports: Array<{ metrics: unknown }>): MonthlyMetrics {
  const sleepValues: number[] = [];
  const workoutValues: number[] = [];
  let totalMeals = 0;
  const mealRatings: number[] = [];

  for (const report of reports) {
    const m = report.metrics as Record<string, unknown>;
    if (typeof m.avgSleepHours === "number") {
      sleepValues.push(m.avgSleepHours);
    }
    const workouts = typeof m.workoutCount === "number" ? m.workoutCount : 0;
    workoutValues.push(workouts);

    const nutrition = m.nutrition as Record<string, unknown> | undefined;
    if (nutrition) {
      const meals = typeof nutrition.mealsLogged === "number" ? nutrition.mealsLogged : 0;
      totalMeals += meals;
      if (typeof nutrition.avgRating === "number") {
        mealRatings.push(nutrition.avgRating);
      }
    }
  }

  const avgSleep = sleepValues.length > 0
    ? Math.round((sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length) * 10) / 10
    : null;

  const totalWorkouts = workoutValues.reduce((a, b) => a + b, 0);
  const avgWorkoutsPerWeek = reports.length > 0
    ? Math.round((totalWorkouts / reports.length) * 10) / 10
    : 0;

  const avgMealRating = mealRatings.length > 0
    ? Math.round((mealRatings.reduce((a, b) => a + b, 0) / mealRatings.length) * 10) / 10
    : null;

  const overallTrend = computeOverallTrend(sleepValues, workoutValues);

  return {
    weeksIncluded: reports.length,
    avgSleepHours: avgSleep,
    totalWorkouts,
    avgWorkoutsPerWeek,
    totalMealsLogged: totalMeals,
    avgMealRating,
    sleepTrend: sleepValues,
    workoutTrend: workoutValues,
    overallTrend,
  };
}

function computeOverallTrend(
  sleepValues: number[],
  workoutValues: number[],
): MonthlyMetrics["overallTrend"] {
  if (sleepValues.length < 2 && workoutValues.length < 2) return "stable";

  let score = 0;

  if (sleepValues.length >= 2) {
    const firstHalf = sleepValues.slice(0, Math.ceil(sleepValues.length / 2));
    const secondHalf = sleepValues.slice(Math.ceil(sleepValues.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    if (avgSecond > avgFirst + 0.3) score++;
    if (avgSecond < avgFirst - 0.3) score--;
  }

  if (workoutValues.length >= 2) {
    const firstHalf = workoutValues.slice(0, Math.ceil(workoutValues.length / 2));
    const secondHalf = workoutValues.slice(Math.ceil(workoutValues.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    if (avgSecond > avgFirst) score++;
    if (avgSecond < avgFirst) score--;
  }

  return score > 0 ? "improving" : score < 0 ? "declining" : "stable";
}

function buildFallbackMonthlyReport(metrics: MonthlyMetrics): string {
  const parts: string[] = [];
  parts.push(`Resumo do seu mês de saúde (${metrics.weeksIncluded} semanas registradas).`);

  if (metrics.avgSleepHours !== null) {
    parts.push(`Média de sono: ${metrics.avgSleepHours} horas por noite.`);
  }

  if (metrics.totalWorkouts > 0) {
    parts.push(`Total de ${metrics.totalWorkouts} treinos (média de ${metrics.avgWorkoutsPerWeek} por semana).`);
  }

  if (metrics.totalMealsLogged > 0) {
    parts.push(`Você registrou ${metrics.totalMealsLogged} refeições no mês.`);
  }

  if (metrics.overallTrend === "improving") {
    parts.push("A tendência do mês mostra que você está melhorando! Continue nesse ritmo.");
  } else if (metrics.overallTrend === "declining") {
    parts.push("Alguns indicadores caíram ao longo do mês. Que tal definir uma meta simples para o próximo?");
  } else {
    parts.push("Seus indicadores se mantiveram estáveis durante o mês. Consistência é chave!");
  }

  return parts.join(" ");
}
