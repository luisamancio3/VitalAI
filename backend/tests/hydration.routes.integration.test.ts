import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn().mockReturnValue("mock-jwks"),
  jwtVerify: vi.fn().mockResolvedValue({
    payload: { sub: "auth0|hydration-test" },
    protectedHeader: { alg: "RS256" },
  }),
}));

vi.mock("../src/config/database.js", () => {
  const mockDb: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ["select", "from", "where", "insert", "values", "update", "set", "orderBy", "groupBy", "having", "onConflictDoUpdate"];
  for (const m of chainMethods) {
    mockDb[m] = vi.fn().mockReturnValue(mockDb);
  }
  mockDb.limit = vi.fn().mockResolvedValue([{ id: "user-hydration-123" }]);
  mockDb.returning = vi.fn().mockResolvedValue([{ id: "log-uuid" }]);
  return { db: mockDb, redis: { get: vi.fn(), set: vi.fn(), setex: vi.fn() } };
});

vi.mock("../src/db/schema.js", () => ({
  users: { id: "users.id", auth0Id: "users.auth0_id", fcmToken: "users.fcm_token" },
  nutritionProfiles: { userId: "nutrition_profiles.user_id" },
  mealFeedback: { userId: "meal_feedback.user_id", createdAt: "meal_feedback.created_at" },
  healthEvents: { id: "health_events.id", userId: "health_events.user_id", triggerType: "health_events.trigger_type", createdAt: "health_events.created_at" },
  weeklyReports: { id: "weekly_reports.id", userId: "weekly_reports.user_id", weekStart: "weekly_reports.week_start" },
  monthlyReports: { userId: "monthly_reports.user_id", month: "monthly_reports.month" },
  notificationLog: {},
  stressScores: { id: "stress_scores.id", userId: "stress_scores.user_id", createdAt: "stress_scores.created_at" },
  hydrationLogs: {
    id: "hydration_logs.id",
    userId: "hydration_logs.user_id",
    amountMl: "hydration_logs.amount_ml",
    source: "hydration_logs.source",
    createdAt: "hydration_logs.created_at",
  },
}));

vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("Beba água!"),
}));
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

describe("Hydration Routes", () => {
  it("POST /hydration/log should accept valid intake", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/hydration/log",
      headers: { authorization: "Bearer mock-token" },
      payload: { amountMl: 250 },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
  });

  it("POST /hydration/log should accept source parameter", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/hydration/log",
      headers: { authorization: "Bearer mock-token" },
      payload: { amountMl: 500, source: "quick_add" },
    });

    expect(response.statusCode).toBe(201);
  });

  it("POST /hydration/log should reject negative amount", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/hydration/log",
      headers: { authorization: "Bearer mock-token" },
      payload: { amountMl: -100 },
    });

    expect(response.statusCode).toBe(400);
  });

  it("POST /hydration/log should reject amount over 5000ml", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/hydration/log",
      headers: { authorization: "Bearer mock-token" },
      payload: { amountMl: 6000 },
    });

    expect(response.statusCode).toBe(400);
  });

  it("POST /hydration/log should reject invalid source", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/hydration/log",
      headers: { authorization: "Bearer mock-token" },
      payload: { amountMl: 250, source: "invalid_source" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("GET /hydration/status should return hydration status", async () => {
    const { db } = await import("../src/config/database.js");
    // First call: user lookup, second call: logs query, third call: recent workout
    (db.limit as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: "user-hydration-123" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/hydration/status",
      headers: { authorization: "Bearer mock-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.todayTotalMl).toBeDefined();
    expect(body.goalMl).toBeDefined();
    expect(body.progress).toBeDefined();
  });

  it("GET /hydration/history should return daily totals", async () => {
    const { db } = await import("../src/config/database.js");
    (db.limit as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: "user-hydration-123" }]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/hydration/history?days=7",
      headers: { authorization: "Bearer mock-token" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("GET /hydration/history should reject days > 90", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/hydration/history?days=100",
      headers: { authorization: "Bearer mock-token" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should require authentication", async () => {
    vi.mocked((await import("jose")).jwtVerify).mockRejectedValueOnce(new Error("invalid"));

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/hydration/status",
    });

    expect(response.statusCode).toBe(401);
  });

  it("should register hydration route prefix", async () => {
    const routes = app.printRoutes({ commonPrefix: false });
    expect(routes).toContain("/api/v1/hydration");
  });
});
