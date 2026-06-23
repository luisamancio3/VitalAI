import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { users, nutritionProfiles, mealFeedback } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { suggestMeal } from "../services/meal-suggestion.service.js";

export const profileSchema = z.object({
  goal: z.enum(["lose", "maintain", "gain"]),
  restrictions: z.array(z.string()).default([]),
  cookingSkill: z.enum(["beginner", "intermediate", "advanced"]),
});

export const profilePatchSchema = z.object({
  goal: z.enum(["lose", "maintain", "gain"]).optional(),
  restrictions: z.array(z.string()).optional(),
  cookingSkill: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export const feedbackSchema = z.object({
  recipeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(200).optional(),
  context: z.string().optional(),
});

export const suggestionQuerySchema = z.object({
  context: z.enum(["post_workout", "breakfast", "lunch", "dinner", "snack"]).optional(),
});

export default async function nutritionRoutes(app: FastifyInstance) {
  // All routes require auth
  app.addHook("preHandler", authMiddleware);

  // --- Nutrition Profile ---

  // POST /profile — create or update
  app.post("/profile", async (request, reply) => {
    const parsed = profileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    try {
      const [profile] = await db
        .insert(nutritionProfiles)
        .values({
          userId: user.id,
          goal: parsed.data.goal,
          restrictions: parsed.data.restrictions,
          cookingSkill: parsed.data.cookingSkill,
        })
        .onConflictDoUpdate({
          target: nutritionProfiles.userId,
          set: {
            goal: parsed.data.goal,
            restrictions: parsed.data.restrictions,
            cookingSkill: parsed.data.cookingSkill,
            updatedAt: new Date(),
          },
        })
        .returning();

      return reply.status(200).send(profile);
    } catch (error) {
      request.log.error(error, "Failed to save nutrition profile");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // GET /profile
  app.get("/profile", async (request, reply) => {
    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    const [profile] = await db
      .select()
      .from(nutritionProfiles)
      .where(eq(nutritionProfiles.userId, user.id))
      .limit(1);

    if (!profile) return reply.status(404).send({ error: "No nutrition profile found" });
    return reply.status(200).send(profile);
  });

  // PATCH /profile
  app.patch("/profile", async (request, reply) => {
    const parsed = profilePatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.goal) updateData.goal = parsed.data.goal;
    if (parsed.data.restrictions) updateData.restrictions = parsed.data.restrictions;
    if (parsed.data.cookingSkill) updateData.cookingSkill = parsed.data.cookingSkill;

    try {
      const [updated] = await db
        .update(nutritionProfiles)
        .set(updateData)
        .where(eq(nutritionProfiles.userId, user.id))
        .returning();

      if (!updated) return reply.status(404).send({ error: "No nutrition profile found" });
      return reply.status(200).send(updated);
    } catch (error) {
      request.log.error(error, "Failed to update nutrition profile");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // --- Meal Suggestions ---

  // GET /suggestion?context=post_workout
  app.get("/suggestion", async (request, reply) => {
    const parsed = suggestionQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    try {
      const result = await suggestMeal(user.id, parsed.data.context ?? "lunch");
      return reply.status(200).send(result);
    } catch (error) {
      request.log.error(error, "Failed to generate meal suggestion");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // --- Meal Feedback ---

  // POST /feedback
  app.post("/feedback", async (request, reply) => {
    const parsed = feedbackSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    try {
      const [feedback] = await db
        .insert(mealFeedback)
        .values({
          userId: user.id,
          recipeId: parsed.data.recipeId,
          rating: parsed.data.rating,
          comment: parsed.data.comment ?? null,
          context: parsed.data.context ?? null,
        })
        .returning();

      return reply.status(201).send(feedback);
    } catch (error) {
      request.log.error(error, "Failed to save meal feedback");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // GET /history — paginated meal feedback
  app.get("/history", async (request, reply) => {
    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    const feedback = await db
      .select()
      .from(mealFeedback)
      .where(eq(mealFeedback.userId, user.id))
      .orderBy(mealFeedback.createdAt)
      .limit(50);

    return reply.status(200).send(feedback);
  });
}
