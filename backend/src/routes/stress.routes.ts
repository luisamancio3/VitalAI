import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { users } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  assessStress,
  getStressHistory,
  getLatestStressScore,
  getBreathingExercises,
} from "../services/stress-detection.service.js";
import type { StressLevel } from "../services/stress-detection.service.js";

const assessSchema = z.object({
  currentHRV: z.number().min(0).max(300),
  averageHRV: z.number().min(0).max(300),
  currentHR: z.number().min(30).max(250),
  averageHR: z.number().min(30).max(250),
  recentActivityLevel: z.number().min(0).max(1).optional(),
});

const historyQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional(),
});

export { assessSchema };

export default async function stressRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  // POST /stress/assess — calculate stress score from biometric data
  app.post("/assess", async (request, reply) => {
    const parsed = assessSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    const assessment = await assessStress(
      user.id,
      parsed.data.currentHRV,
      parsed.data.averageHRV,
      parsed.data.currentHR,
      parsed.data.averageHR,
      parsed.data.recentActivityLevel ?? 0,
    );

    return reply.status(200).send(assessment);
  });

  // GET /stress/current — get most recent stress score
  app.get("/current", async (request, reply) => {
    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    const latest = await getLatestStressScore(user.id);
    if (!latest) {
      return reply.status(200).send({ score: null, message: "Nenhum dado de estresse ainda." });
    }

    return reply.status(200).send(latest);
  });

  // GET /stress/history — stress score history
  app.get("/history", async (request, reply) => {
    const parsed = historyQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    const history = await getStressHistory(user.id, parsed.data?.days ?? 7);
    return reply.status(200).send(history);
  });

  // GET /stress/exercises — breathing exercise catalog
  app.get("/exercises", async (request, reply) => {
    const level = (request.query as { level?: string }).level as StressLevel | undefined;
    const exercises = getBreathingExercises(level);
    return reply.status(200).send(exercises);
  });
}
