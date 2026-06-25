import { eq, desc, and, gte } from "drizzle-orm";
import { db } from "../config/database.js";
import { stressScores } from "../db/schema.js";
import { generateMessage } from "../config/claude.js";

export type StressLevel = "low" | "moderate" | "high" | "very_high";

interface StressFactors {
  hrvDeviation: number;     // % below 7-day average (0-100)
  heartRateElevation: number; // % above resting average (0-100)
  timeOfDayFactor: number;  // 0-1 weight based on typical stress hours
  recentActivityLevel: number; // 0-1 (high activity = lower stress signal)
}

interface StressAssessment {
  score: number;        // 0-100
  level: StressLevel;
  factors: StressFactors;
  recommendation: string;
}

const BREATHING_EXERCISES = [
  {
    id: "box_breathing",
    name: "Respiração Quadrada",
    description: "Inspire 4s, segure 4s, expire 4s, segure 4s. Repita 4 vezes.",
    durationSeconds: 64,
    inhale: 4,
    hold: 4,
    exhale: 4,
    holdAfter: 4,
    cycles: 4,
    level: "beginner" as const,
  },
  {
    id: "478_breathing",
    name: "Respiração 4-7-8",
    description: "Inspire 4s, segure 7s, expire 8s. Repita 3 vezes.",
    durationSeconds: 57,
    inhale: 4,
    hold: 7,
    exhale: 8,
    holdAfter: 0,
    cycles: 3,
    level: "intermediate" as const,
  },
  {
    id: "coherent_breathing",
    name: "Respiração Coerente",
    description: "Inspire 5s, expire 5s. Ritmo constante por 2 minutos.",
    durationSeconds: 120,
    inhale: 5,
    hold: 0,
    exhale: 5,
    holdAfter: 0,
    cycles: 12,
    level: "beginner" as const,
  },
  {
    id: "physiological_sigh",
    name: "Suspiro Fisiológico",
    description: "Inspire rápido 2x pelo nariz, expire longo pela boca. Repita 5 vezes.",
    durationSeconds: 50,
    inhale: 2,
    hold: 0,
    exhale: 8,
    holdAfter: 0,
    cycles: 5,
    level: "beginner" as const,
  },
];

export function calculateStressScore(factors: StressFactors): { score: number; level: StressLevel } {
  const hrvWeight = 0.40;
  const hrWeight = 0.30;
  const timeWeight = 0.15;
  const activityWeight = 0.15;

  const hrvScore = Math.min(factors.hrvDeviation * 1.5, 100);
  const hrScore = Math.min(factors.heartRateElevation * 1.2, 100);
  const timeScore = factors.timeOfDayFactor * 100;
  const activityAdjustment = factors.recentActivityLevel * 20;

  const rawScore = (hrvScore * hrvWeight)
    + (hrScore * hrWeight)
    + (timeScore * timeWeight)
    - (activityAdjustment * activityWeight);

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let level: StressLevel;
  if (score <= 25) level = "low";
  else if (score <= 50) level = "moderate";
  else if (score <= 75) level = "high";
  else level = "very_high";

  return { score, level };
}

export function getTimeOfDayFactor(hour: number): number {
  // Stress tends to peak mid-morning and late afternoon
  if (hour >= 9 && hour <= 11) return 0.7;
  if (hour >= 14 && hour <= 17) return 0.8;
  if (hour >= 18 && hour <= 20) return 0.5;
  if (hour >= 21 || hour < 6) return 0.2;
  return 0.4;
}

export async function assessStress(
  userId: string,
  currentHRV: number,
  averageHRV: number,
  currentHR: number,
  averageHR: number,
  recentActivityLevel: number = 0,
): Promise<StressAssessment> {
  const hour = new Date().getHours();

  const factors: StressFactors = {
    hrvDeviation: averageHRV > 0 ? Math.max(0, ((averageHRV - currentHRV) / averageHRV) * 100) : 0,
    heartRateElevation: averageHR > 0 ? Math.max(0, ((currentHR - averageHR) / averageHR) * 100) : 0,
    timeOfDayFactor: getTimeOfDayFactor(hour),
    recentActivityLevel: Math.min(1, Math.max(0, recentActivityLevel)),
  };

  const { score, level } = calculateStressScore(factors);

  let recommendation: string;
  try {
    recommendation = await generateMessage(
      "You are VitalAI, a friendly health coach. The user's stress level has been assessed. "
      + `Score: ${score}/100 (${level}). `
      + `HRV is ${factors.hrvDeviation.toFixed(0)}% below average. `
      + `Heart rate is ${factors.heartRateElevation.toFixed(0)}% above resting average. `
      + "Give a brief, calming recommendation. If stress is high, suggest a breathing exercise. "
      + "Keep it under 2 sentences. Use Portuguese (BR).",
      JSON.stringify({ score, level, factors }),
    );
  } catch {
    recommendation = buildFallbackRecommendation(level);
  }

  await db.insert(stressScores).values({
    userId,
    score,
    level,
    factors,
    recommendation,
  });

  return { score, level, factors, recommendation };
}

function buildFallbackRecommendation(level: StressLevel): string {
  switch (level) {
    case "low":
      return "Seus níveis de estresse estão ótimos! Continue assim.";
    case "moderate":
      return "Estresse moderado detectado. Que tal uma pausa de 5 minutos para respirar?";
    case "high":
      return "Seu corpo está pedindo atenção. Tente o exercício de Respiração Quadrada para relaxar.";
    case "very_high":
      return "Nível de estresse muito alto. Pare o que está fazendo e faça 3 ciclos de Respiração 4-7-8.";
  }
}

export async function getStressHistory(userId: string, days: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return db
    .select({
      id: stressScores.id,
      score: stressScores.score,
      level: stressScores.level,
      factors: stressScores.factors,
      recommendation: stressScores.recommendation,
      createdAt: stressScores.createdAt,
    })
    .from(stressScores)
    .where(
      and(
        eq(stressScores.userId, userId),
        gte(stressScores.createdAt, since),
      ),
    )
    .orderBy(desc(stressScores.createdAt))
    .limit(100);
}

export function getBreathingExercises(level?: StressLevel) {
  if (!level) return BREATHING_EXERCISES;

  if (level === "low" || level === "moderate") {
    return BREATHING_EXERCISES.filter(e => e.level === "beginner");
  }
  return BREATHING_EXERCISES;
}

export async function getLatestStressScore(userId: string) {
  const [latest] = await db
    .select()
    .from(stressScores)
    .where(eq(stressScores.userId, userId))
    .orderBy(desc(stressScores.createdAt))
    .limit(1);
  return latest ?? null;
}
