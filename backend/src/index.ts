import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import "dotenv/config";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(helmet);

// Health check
app.get("/health", async () => ({
  status: "ok",
  service: "vitalai-api",
  timestamp: new Date().toISOString(),
}));

// Routes will be registered here
// await app.register(authRoutes, { prefix: "/api/v1/auth" });
// await app.register(eventsRoutes, { prefix: "/api/v1/events" });
// await app.register(nutritionRoutes, { prefix: "/api/v1/nutrition" });
// await app.register(reportsRoutes, { prefix: "/api/v1/reports" });
// await app.register(usersRoutes, { prefix: "/api/v1/users" });

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
