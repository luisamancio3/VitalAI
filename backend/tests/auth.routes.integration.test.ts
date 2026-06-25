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
  users: { id: "users.id", auth0Id: "users.auth0_id", fcmToken: "users.fcm_token" },
  nutritionProfiles: { userId: "nutrition_profiles.user_id" },
  mealFeedback: { userId: "meal_feedback.user_id", createdAt: "meal_feedback.created_at" },
  healthEvents: { id: "health_events.id" },
  weeklyReports: { id: "weekly_reports.id", userId: "weekly_reports.user_id", weekStart: "weekly_reports.week_start" },
  notificationLog: {},
  stressScores: { id: "stress_scores.id", userId: "stress_scores.user_id", createdAt: "stress_scores.created_at" },
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

describe("POST /api/v1/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "uuid-user-123",
      auth0Id: "auth0|test-user-123",
    }]);
  });

  it("should register a new user", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: { authorization: AUTH_HEADER },
      payload: { email: "luis@test.com", name: "Luis" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe("uuid-user-123");
    expect(body.auth0Id).toBe("auth0|test-user-123");
  });

  it("should register without email or name", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: { authorization: AUTH_HEADER },
      payload: {},
    });

    expect(response.statusCode).toBe(200);
  });

  it("should return 400 for invalid email", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: { authorization: AUTH_HEADER },
      payload: { email: "not-an-email" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 without auth", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: "test@test.com" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 500 when DB insert fails", async () => {
    (db.returning as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      headers: { authorization: AUTH_HEADER },
      payload: { email: "test@test.com" },
    });

    expect(response.statusCode).toBe(500);
  });
});

describe("POST /api/v1/auth/fcm-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "uuid-user-123" }]);
  });

  it("should update FCM token successfully", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/fcm-token",
      headers: { authorization: AUTH_HEADER },
      payload: { fcmToken: "a".repeat(152) },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);
  });

  it("should return 400 for token too short", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/fcm-token",
      headers: { authorization: AUTH_HEADER },
      payload: { fcmToken: "short" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for missing fcmToken", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/fcm-token",
      headers: { authorization: AUTH_HEADER },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 404 when user not registered", async () => {
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/fcm-token",
      headers: { authorization: AUTH_HEADER },
      payload: { fcmToken: "a".repeat(152) },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 without auth", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/fcm-token",
      payload: { fcmToken: "a".repeat(152) },
    });

    expect(response.statusCode).toBe(401);
  });
});
