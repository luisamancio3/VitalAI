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
  mockDb.returning = vi.fn().mockResolvedValue([{ id: "event-uuid-1" }]);
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    setex: vi.fn().mockResolvedValue("OK"),
    exists: vi.fn().mockResolvedValue(0),
    del: vi.fn().mockResolvedValue(1),
  };
  return { db: mockDb, redis: mockRedis };
});

vi.mock("../src/db/schema.js", () => ({
  users: { id: "users.id", auth0Id: "users.auth0_id", fcmToken: "users.fcm_token", notificationPreferences: "users.notification_preferences" },
  nutritionProfiles: { userId: "nutrition_profiles.user_id" },
  mealFeedback: { userId: "meal_feedback.user_id", createdAt: "meal_feedback.created_at" },
  healthEvents: { id: "health_events.id" },
  weeklyReports: { id: "weekly_reports.id", userId: "weekly_reports.user_id", weekStart: "weekly_reports.week_start" },
  notificationLog: { userId: "notification_log.user_id", delivered: "notification_log.delivered", createdAt: "notification_log.created_at" },
  stressScores: { id: "stress_scores.id", userId: "stress_scores.user_id", createdAt: "stress_scores.created_at" },
  hydrationLogs: { id: "hydration_logs.id", userId: "hydration_logs.user_id", amountMl: "hydration_logs.amount_ml", source: "hydration_logs.source", createdAt: "hydration_logs.created_at" },
}));

vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("Ótimo treino! Descanse."),
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

import { db, redis } from "../src/config/database.js";

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

describe("POST /api/v1/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // User lookup returns user with notification prefs (no quiet hours → defaults handled)
    // The processEvent calls: 1) getUserNotificationPreferences → limit, 2) getTodayNotificationCount → result[0]
    // We make the user lookup return a user, and internal calls fall through gracefully
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "uuid-user-123", notificationPreferences: { quietHoursStart: 2, quietHoursEnd: 2 } }]);
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "event-uuid-1" }]);
    (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue("OK");
  });

  it("should process a valid post_workout event", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: { authorization: AUTH_HEADER },
      payload: {
        triggerType: "post_workout",
        payload: { duration: 45, type: "running" },
        timestamp: "2026-06-23T12:00:00Z",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.processed).toBe(true);
    expect(body.triggerType).toBe("post_workout");
    expect(body.message).toBeDefined();
  });

  it("should process morning_sleep event", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: { authorization: AUTH_HEADER },
      payload: {
        triggerType: "morning_sleep",
        payload: { hours: 7.5, quality: "good" },
        timestamp: "2026-06-23T07:00:00Z",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().processed).toBe(true);
  });

  it("should reject event on cooldown", async () => {
    (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: { authorization: AUTH_HEADER },
      payload: {
        triggerType: "high_heart_rate",
        payload: { bpm: 120 },
        timestamp: "2026-06-23T12:00:00Z",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.processed).toBe(false);
    expect(body.reason).toBe("cooldown");
  });

  it("should return 400 for invalid triggerType", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: { authorization: AUTH_HEADER },
      payload: {
        triggerType: "unknown_event",
        payload: {},
        timestamp: "2026-06-23T12:00:00Z",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for invalid timestamp format", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: { authorization: AUTH_HEADER },
      payload: {
        triggerType: "post_workout",
        payload: {},
        timestamp: "not-a-date",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for missing payload", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: { authorization: AUTH_HEADER },
      payload: {
        triggerType: "post_workout",
        timestamp: "2026-06-23T12:00:00Z",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 without authorization", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      payload: {
        triggerType: "post_workout",
        payload: {},
        timestamp: "2026-06-23T12:00:00Z",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 404 when user not found", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/events",
      headers: { authorization: AUTH_HEADER },
      payload: {
        triggerType: "low_hrv",
        payload: { hrv: 20 },
        timestamp: "2026-06-23T12:00:00Z",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toContain("User not found");
  });

  it("should accept all valid trigger types", async () => {
    const types = ["post_workout", "morning_sleep", "low_hrv", "high_heart_rate", "meal_detected", "inactivity", "hydration_reminder"];

    for (const triggerType of types) {
      vi.clearAllMocks();
      (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "uuid-user-123", notificationPreferences: { quietHoursStart: 2, quietHoursEnd: 2 } }]);
      (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "event-uuid-1" }]);
      (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue("OK");

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/events",
        headers: { authorization: AUTH_HEADER },
        payload: {
          triggerType,
          payload: {},
          timestamp: "2026-06-23T12:00:00Z",
        },
      });

      expect(response.statusCode).toBe(200);
    }
  });
});
