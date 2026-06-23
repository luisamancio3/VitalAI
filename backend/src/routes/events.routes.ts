import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { processEvent } from "../services/trigger-processor.js";
import { authMiddleware } from "../middleware/auth.js";
import { db } from "../config/database.js";
import { users } from "../db/schema.js";

export const eventSchema = z.object({
  triggerType: z.enum([
    "post_workout",
    "morning_sleep",
    "low_hrv",
    "high_heart_rate",
    "meal_detected",
    "inactivity",
    "hydration_reminder",
  ] as const),
  payload: z.record(z.unknown()),
  timestamp: z.string().datetime(),
});

export default async function eventsRoutes(app: FastifyInstance) {
  // POST /api/v1/events — Receive classified events from phone
  app.post("/", { preHandler: [authMiddleware] }, async (request, reply) => {
    const parsed = eventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    try {
      // Look up internal user ID from Auth0 sub
      const auth0Id = request.userId;
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.auth0Id, auth0Id))
        .limit(1);

      if (!user) {
        return reply.status(404).send({ error: "User not found. Call /auth/register first." });
      }

      const result = await processEvent({
        userId: user.id,
        triggerType: parsed.data.triggerType,
        payload: parsed.data.payload,
        timestamp: parsed.data.timestamp,
      });

      return { processed: result.processed, message: result.message, triggerType: parsed.data.triggerType, reason: result.reason };
    } catch (error) {
      request.log.error(error, "Failed to process event");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
