import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import "dotenv/config";

import authRoutes from "./routes/auth.routes.js";
import eventsRoutes from "./routes/events.routes.js";

const app = Fastify({ logger: true });

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:5173"];

await app.register(cors, { origin: CORS_ORIGINS });
await app.register(helmet);
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
  keyGenerator: (request) => {
    return request.userId ?? request.ip;
  },
});

// Health check
app.get("/health", async () => ({
  status: "ok",
  service: "vitalai-api",
  timestamp: new Date().toISOString(),
}));

// Routes
await app.register(authRoutes, { prefix: "/api/v1/auth" });
await app.register(eventsRoutes, { prefix: "/api/v1/events" });
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
