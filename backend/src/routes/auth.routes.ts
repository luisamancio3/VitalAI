import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { users } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

export default async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/register — Sync Auth0 user to local DB
  app.post("/register", { preHandler: [authMiddleware] }, async (request, reply) => {
    const auth0Id = request.userId;
    const body = request.body as { email?: string; name?: string };

    const email = body.email ?? "unknown@vitalai.app";
    const name = body.name ?? null;

    const [user] = await db
      .insert(users)
      .values({ auth0Id, email, name })
      .onConflictDoUpdate({
        target: users.auth0Id,
        set: { email, name, updatedAt: new Date() },
      })
      .returning();

    return reply.status(200).send({ id: user.id, auth0Id: user.auth0Id });
  });

  // POST /api/v1/auth/fcm-token — Register FCM token for push notifications
  app.post("/fcm-token", { preHandler: [authMiddleware] }, async (request, reply) => {
    const auth0Id = request.userId;
    const body = request.body as { fcmToken: string };

    if (!body.fcmToken) {
      return reply.status(400).send({ error: "fcmToken is required" });
    }

    const result = await db
      .update(users)
      .set({ fcmToken: body.fcmToken, updatedAt: new Date() })
      .where(eq(users.auth0Id, auth0Id))
      .returning({ id: users.id });

    if (result.length === 0) {
      return reply.status(404).send({ error: "User not found" });
    }

    return reply.status(200).send({ success: true });
  });
}
