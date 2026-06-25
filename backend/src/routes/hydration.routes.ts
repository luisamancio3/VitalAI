import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { users } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  logWaterIntake,
  getHydrationStatus,
  getHydrationHistory,
} from "../services/hydration.service.js";

const logIntakeSchema = z.object({
  amountMl: z.number().int().min(1).max(5000),
  source: z.enum(["manual", "quick_add", "siri"]).optional(),
});

const historyQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional(),
});

export { logIntakeSchema };

export default async function hydrationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  // POST /hydration/log — log water intake
  app.post("/log", async (request, reply) => {
    const parsed = logIntakeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    const result = await logWaterIntake(
      user.id,
      parsed.data.amountMl,
      parsed.data.source ?? "manual",
    );

    return reply.status(201).send(result);
  });

  // GET /hydration/status — today's hydration status
  app.get("/status", async (request, reply) => {
    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    const status = await getHydrationStatus(user.id);
    return reply.status(200).send(status);
  });

  // GET /hydration/history — daily totals
  app.get("/history", async (request, reply) => {
    const parsed = historyQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    const history = await getHydrationHistory(user.id, parsed.data?.days ?? 7);
    return reply.status(200).send(history);
  });
}
