import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn().mockReturnValue("mock-jwks"),
  jwtVerify: vi.fn().mockResolvedValue({
    payload: { sub: "auth0|test-user-123" },
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
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    setex: vi.fn().mockResolvedValue("OK"),
  };
  return { db: mockDb, redis: mockRedis };
});

vi.mock("../src/db/schema.js", () => ({
  users: { id: "users.id", auth0Id: "users.auth0_id", fcmToken: "users.fcm_token", notificationPreferences: "users.notification_preferences" },
  nutritionProfiles: { userId: "nutrition_profiles.user_id" },
  mealFeedback: { userId: "meal_feedback.user_id", createdAt: "meal_feedback.created_at" },
  healthEvents: { id: "health_events.id" },
  weeklyReports: { id: "weekly_reports.id", userId: "weekly_reports.user_id", weekStart: "weekly_reports.week_start" },
  monthlyReports: { userId: "monthly_reports.user_id", month: "monthly_reports.month" },
  notificationLog: {},
}));

vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("mock"),
}));

vi.mock("../src/config/firebase.js", () => ({
  sendPushNotification: vi.fn().mockResolvedValue("mock-id"),
}));

vi.mock("../src/services/notification.service.js", () => ({
  getUserFcmToken: vi.fn().mockResolvedValue(null),
  deliverNotification: vi.fn().mockResolvedValue({ success: true, messageId: "msg-1" }),
}));

vi.mock("../src/services/meal-suggestion.service.js", () => ({
  suggestMeal: vi.fn().mockResolvedValue({ recipe: {}, message: "mock" }),
}));

import { db } from "../src/config/database.js";

let app: FastifyInstance;

beforeAll(async () => {
  const { buildApp } = await import("../src/app.js");
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

const AUTH_HEADER = "Bearer valid-test-token";

describe("GET /api/v1/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return user notification preferences", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{
      notificationPreferences: { quietHoursStart: 22, quietHoursEnd: 7, dailyBudget: 6 },
    }]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/preferences",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.quietHoursStart).toBe(22);
    expect(body.dailyBudget).toBe(6);
  });

  it("should return empty object when no preferences set", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{
      notificationPreferences: null,
    }]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/preferences",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({});
  });

  it("should return 404 when user not found", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/preferences",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 without auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/preferences",
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("PUT /api/v1/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{
      notificationPreferences: { quietHoursStart: 23, quietHoursEnd: 6, dailyBudget: 8 },
    }]);
  });

  it("should update quiet hours", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/preferences",
      headers: { authorization: AUTH_HEADER },
      payload: { quietHoursStart: 23, quietHoursEnd: 6 },
    });

    expect(response.statusCode).toBe(200);
  });

  it("should update daily budget", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/preferences",
      headers: { authorization: AUTH_HEADER },
      payload: { dailyBudget: 8 },
    });

    expect(response.statusCode).toBe(200);
  });

  it("should update disabled triggers", async () => {
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{
      notificationPreferences: { disabledTriggers: ["inactivity", "hydration_reminder"] },
    }]);

    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/preferences",
      headers: { authorization: AUTH_HEADER },
      payload: { disabledTriggers: ["inactivity", "hydration_reminder"] },
    });

    expect(response.statusCode).toBe(200);
  });

  it("should return 400 for invalid quietHoursStart", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/preferences",
      headers: { authorization: AUTH_HEADER },
      payload: { quietHoursStart: 25 },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for dailyBudget below 1", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/preferences",
      headers: { authorization: AUTH_HEADER },
      payload: { dailyBudget: 0 },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for dailyBudget above 20", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/preferences",
      headers: { authorization: AUTH_HEADER },
      payload: { dailyBudget: 21 },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for invalid trigger type in disabledTriggers", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/preferences",
      headers: { authorization: AUTH_HEADER },
      payload: { disabledTriggers: ["invalid_trigger"] },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 404 when user not found", async () => {
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/preferences",
      headers: { authorization: AUTH_HEADER },
      payload: { dailyBudget: 5 },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 without auth", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/preferences",
      payload: { dailyBudget: 5 },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 500 when DB update fails", async () => {
    (db.returning as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB down"));

    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/preferences",
      headers: { authorization: AUTH_HEADER },
      payload: { dailyBudget: 5 },
    });

    expect(response.statusCode).toBe(500);
  });
});
