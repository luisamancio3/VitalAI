import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { processEvent, type TriggerType } from "../services/trigger-processor.js";

const eventSchema = z.object({
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
  app.post("/", async (request, reply) => {
    const parsed = eventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    // TODO: Extract userId from JWT auth middleware
    const userId = "placeholder-user-id";

    const processed = await processEvent({
      userId,
      triggerType: parsed.data.triggerType,
      payload: parsed.data.payload,
      timestamp: parsed.data.timestamp,
    });

    return { processed, triggerType: parsed.data.triggerType };
  });
}
