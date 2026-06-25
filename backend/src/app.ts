import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import authRoutes from "./routes/auth.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import nutritionRoutes from "./routes/nutrition.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import preferencesRoutes from "./routes/preferences.routes.js";
import stressRoutes from "./routes/stress.routes.js";
import hydrationRoutes from "./routes/hydration.routes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

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

  app.get("/health", async () => ({
    status: "ok",
    service: "vitalai-api",
    timestamp: new Date().toISOString(),
  }));

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(eventsRoutes, { prefix: "/api/v1/events" });
  await app.register(nutritionRoutes, { prefix: "/api/v1/nutrition" });
  await app.register(reportsRoutes, { prefix: "/api/v1/reports" });
  await app.register(preferencesRoutes, { prefix: "/api/v1/preferences" });
  await app.register(stressRoutes, { prefix: "/api/v1/stress" });
  await app.register(hydrationRoutes, { prefix: "/api/v1/hydration" });

  return app;
}
