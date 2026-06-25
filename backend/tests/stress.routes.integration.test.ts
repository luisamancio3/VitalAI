import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn().mockReturnValue("mock-jwks"),
  jwtVerify: vi.fn().mockResolvedValue({
    payload: { sub: "auth0|stress-test" },
    protectedHeader: { alg: "RS256" },
  }),
}));

vi.mock("../src/config/database.js", () => {
  const mockDb: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ["select", "from", "where", "insert", "values", "update", "set", "orderBy", "groupBy", "having", "onConflictDoUpdate"];
  for (const m of chainMethods) {
    mockDb[m] = vi.fn().mockReturnValue(mockDb);
  }
  mockDb.limit = vi.fn().mockResolvedValue([{ id: "user-stress-123" }]);
  mockDb.returning = vi.fn().mockResolvedValue([{ id: "stress-score-uuid" }]);
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
  stressScores: { id: "stress_scores.id", userId: "stress_scores.user_id", createdAt: "stress_scores.created_at" },
  hydrationLogs: { id: "hydration_logs.id", userId: "hydration_logs.user_id", amountMl: "hydration_logs.amount_ml", source: "hydration_logs.source", createdAt: "hydration_logs.created_at" },
}));

vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("Respire fundo e relaxe por um momento."),
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

describe("Stress Routes", () => {
  it("POST /stress/assess should return stress assessment", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/stress/assess",
      headers: { authorization: "Bearer mock-token" },
      payload: {
        currentHRV: 25,
        averageHRV: 45,
        currentHR: 85,
        averageHR: 65,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.score).toBeDefined();
    expect(body.level).toBeDefined();
    expect(body.factors).toBeDefined();
    expect(body.recommendation).toBeDefined();
    expect(["low", "moderate", "high", "very_high"]).toContain(body.level);
  });

  it("POST /stress/assess should accept optional activityLevel", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/stress/assess",
      headers: { authorization: "Bearer mock-token" },
      payload: {
        currentHRV: 30,
        averageHRV: 40,
        currentHR: 75,
        averageHR: 65,
        recentActivityLevel: 0.8,
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it("POST /stress/assess should reject invalid HRV", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/stress/assess",
      headers: { authorization: "Bearer mock-token" },
      payload: {
        currentHRV: -5,
        averageHRV: 45,
        currentHR: 70,
        averageHR: 65,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("POST /stress/assess should reject HR above 250", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/stress/assess",
      headers: { authorization: "Bearer mock-token" },
      payload: {
        currentHRV: 30,
        averageHRV: 45,
        currentHR: 300,
        averageHR: 65,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("GET /stress/current should return latest score", async () => {
    const { db } = await import("../src/config/database.js");
    (db.limit as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: "user-stress-123" }])
      .mockResolvedValueOnce([{ id: "s1", score: 42, level: "moderate", createdAt: new Date() }]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/stress/current",
      headers: { authorization: "Bearer mock-token" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("GET /stress/current should return null when no data", async () => {
    const { db } = await import("../src/config/database.js");
    (db.limit as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: "user-stress-123" }])
      .mockResolvedValueOnce([]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/stress/current",
      headers: { authorization: "Bearer mock-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.score).toBeNull();
  });

  it("GET /stress/exercises should return exercise catalog", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/stress/exercises",
      headers: { authorization: "Bearer mock-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(4);
    expect(body[0].name).toBeDefined();
    expect(body[0].inhale).toBeDefined();
    expect(body[0].exhale).toBeDefined();
  });

  it("GET /stress/exercises?level=low should filter exercises", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/stress/exercises?level=low",
      headers: { authorization: "Bearer mock-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.every((e: { level: string }) => e.level === "beginner")).toBe(true);
  });

  it("GET /stress/history should return history array", async () => {
    const { db } = await import("../src/config/database.js");
    (db.limit as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: "user-stress-123" }])
      .mockResolvedValueOnce([
        { id: "s1", score: 35, level: "moderate", createdAt: new Date() },
        { id: "s2", score: 22, level: "low", createdAt: new Date() },
      ]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/stress/history?days=7",
      headers: { authorization: "Bearer mock-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("should require authentication", async () => {
    vi.mocked((await import("jose")).jwtVerify).mockRejectedValueOnce(new Error("invalid"));

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/stress/current",
    });

    expect(response.statusCode).toBe(401);
  });

  it("should register stress route prefix", async () => {
    const routes = app.printRoutes({ commonPrefix: false });
    expect(routes).toContain("/api/v1/stress");
  });
});
