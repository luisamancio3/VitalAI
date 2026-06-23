import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { users } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

export const preferencesSchema = z.object({
  quietHoursStart: z.number().int().min(0).max(23).optional(),
  quietHoursEnd: z.number().int().min(0).max(23).optional(),
  dailyBudget: z.number().int().min(1).max(20).optional(),
  disabledTriggers: z.array(z.enum([
    "post_workout",
    "morning_sleep",
    "low_hrv",
    "high_heart_rate",
    "meal_detected",
    "inactivity",
    "hydration_reminder",
  ])).optional(),
});

export default async function preferencesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  // GET /preferences — get notification preferences
  app.get("/", async (request, reply) => {
    const auth0Id = request.userId;
    const [user] = await db
      .select({ notificationPreferences: users.notificationPreferences })
      .from(users)
      .where(eq(users.auth0Id, auth0Id))
      .limit(1);

    if (!user) return reply.status(404).send({ error: "User not found" });

    return reply.status(200).send(user.notificationPreferences ?? {});
  });

  // PUT /preferences — replace notification preferences
  app.put("/", async (request, reply) => {
    const parsed = preferencesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const auth0Id = request.userId;

    try {
      const [updated] = await db
        .update(users)
        .set({
          notificationPreferences: parsed.data,
          updatedAt: new Date(),
        })
        .where(eq(users.auth0Id, auth0Id))
        .returning({ notificationPreferences: users.notificationPreferences });

      if (!updated) return reply.status(404).send({ error: "User not found" });

      return reply.status(200).send(updated.notificationPreferences);
    } catch (error) {
      request.log.error(error, "Failed to update preferences");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
