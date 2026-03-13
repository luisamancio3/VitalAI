import type { FastifyInstance } from "fastify";

export default async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/register — Register new user
  app.post("/register", async (request, reply) => {
    // TODO: Validate Auth0/Clerk token, create user record
    return { message: "Registration endpoint — not yet implemented" };
  });

  // POST /api/v1/auth/token — Exchange auth code for JWT
  app.post("/token", async (request, reply) => {
    // TODO: Validate OAuth code, issue JWT
    return { message: "Token endpoint — not yet implemented" };
  });

  // POST /api/v1/auth/fcm-token — Register FCM token for push notifications
  app.post("/fcm-token", async (request, reply) => {
    // TODO: Store FCM token for user
    return { message: "FCM token endpoint — not yet implemented" };
  });
}
