import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn().mockReturnValue("mock-jwks"),
  jwtVerify: vi.fn().mockResolvedValue({
    payload: { sub: "auth0|test" },
    protectedHeader: { alg: "RS256" },
  }),
}));

vi.mock("../src/config/database.js", () => {
  const mockDb: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ["select", "from", "where", "insert", "values", "update", "set", "orderBy", "groupBy", "having", "onConflictDoUpdate"];
  for (const m of chainMethods) {
    mockDb[m] = vi.fn().mockReturnValue(mockDb);
  }
  mockDb.limit = vi.fn().mockResolvedValue([]);
  mockDb.returning = vi.fn().mockResolvedValue([]);
  return { db: mockDb, redis: { get: vi.fn(), set: vi.fn(), setex: vi.fn() } };
});

vi.mock("../src/db/schema.js", () => ({
  users: { id: "users.id", auth0Id: "users.auth0_id", fcmToken: "users.fcm_token" },
  nutritionProfiles: { userId: "nutrition_profiles.user_id" },
  mealFeedback: { userId: "meal_feedback.user_id", createdAt: "meal_feedback.created_at" },
  healthEvents: { id: "health_events.id" },
  weeklyReports: { id: "weekly_reports.id", userId: "weekly_reports.user_id", weekStart: "weekly_reports.week_start" },
  monthlyReports: { userId: "monthly_reports.user_id", month: "monthly_reports.month" },
  notificationLog: {},
}));

vi.mock("../src/config/claude.js", () => ({ generateMessage: vi.fn() }));
vi.mock("../src/config/firebase.js", () => ({ sendPushNotification: vi.fn() }));
vi.mock("../src/services/notification.service.js", () => ({
  getUserFcmToken: vi.fn().mockResolvedValue(null),
  deliverNotification: vi.fn().mockResolvedValue({ success: true, messageId: "m" }),
}));
vi.mock("../src/services/meal-suggestion.service.js", () => ({
  suggestMeal: vi.fn().mockResolvedValue({ recipe: {}, message: "" }),
}));

let app: FastifyInstance;

beforeAll(async () => {
  const { buildApp } = await import("../src/app.js");
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("Health Check", () => {
  it("GET /health should return 200 with status ok", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("vitalai-api");
    expect(body.timestamp).toBeDefined();
  });

  it("should not require authentication for health check", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
  });
});

describe("App Initialization", () => {
  it("should register all expected route prefixes", async () => {
    const routes = app.printRoutes({ commonPrefix: false });

    expect(routes).toContain("/health");
    expect(routes).toContain("/api/v1/auth");
    expect(routes).toContain("/api/v1/events");
    expect(routes).toContain("/api/v1/nutrition");
    expect(routes).toContain("/api/v1/reports");
    expect(routes).toContain("/api/v1/preferences");
  });

  it("should return 404 for unknown routes", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nonexistent",
    });

    expect(response.statusCode).toBe(404);
  });
});
