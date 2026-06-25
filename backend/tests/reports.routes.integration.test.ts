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
  const chainMethods = ["select", "from", "insert", "values", "update", "set", "groupBy", "having", "onConflictDoUpdate"];
  for (const m of chainMethods) {
    mockDb[m] = vi.fn().mockReturnValue(mockDb);
  }
  mockDb.where = vi.fn().mockReturnValue(mockDb);
  mockDb.orderBy = vi.fn().mockReturnValue(mockDb);
  mockDb.limit = vi.fn().mockResolvedValue([]);
  mockDb.returning = vi.fn().mockResolvedValue([{ id: "report-uuid-1" }]);
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
  healthEvents: { userId: "health_events.user_id", createdAt: "health_events.created_at", triggerType: "health_events.trigger_type" },
  weeklyReports: { id: "weekly_reports.id", userId: "weekly_reports.user_id", weekStart: "weekly_reports.week_start", weekEnd: "weekly_reports.week_end", createdAt: "weekly_reports.created_at", metrics: "weekly_reports.metrics" },
  notificationLog: { userId: "notification_log.user_id", delivered: "notification_log.delivered", createdAt: "notification_log.created_at" },
  monthlyReports: { userId: "monthly_reports.user_id", month: "monthly_reports.month" },
  stressScores: { id: "stress_scores.id", userId: "stress_scores.user_id", createdAt: "stress_scores.created_at" },
  hydrationLogs: { id: "hydration_logs.id", userId: "hydration_logs.user_id", amountMl: "hydration_logs.amount_ml", source: "hydration_logs.source", createdAt: "hydration_logs.created_at" },
}));

vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("Sua semana foi ótima!"),
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

describe("GET /api/v1/reports/weekly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (db.orderBy as ReturnType<typeof vi.fn>).mockReturnValue(db);
  });

  it("should return list of weekly reports", async () => {
    let limitCallCount = 0;
    (db.limit as ReturnType<typeof vi.fn>).mockImplementation(() => {
      limitCallCount++;
      if (limitCallCount === 1) {
        return Promise.resolve([{ id: "uuid-user-123" }]);
      }
      return Promise.resolve([
        { id: "r1", weekStart: "2026-06-15", weekEnd: "2026-06-21", createdAt: "2026-06-22" },
        { id: "r2", weekStart: "2026-06-08", weekEnd: "2026-06-14", createdAt: "2026-06-15" },
      ]);
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/weekly",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveLength(2);
    expect(body[0]).toHaveProperty("weekStart");
  });

  it("should return empty array when no reports exist", async () => {
    let limitCallCount = 0;
    (db.limit as ReturnType<typeof vi.fn>).mockImplementation(() => {
      limitCallCount++;
      if (limitCallCount === 1) {
        return Promise.resolve([{ id: "uuid-user-123" }]);
      }
      return Promise.resolve([]);
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/weekly",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("should return 404 when user not found", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/weekly",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 without auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/weekly",
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("GET /api/v1/reports/weekly/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(db);
  });

  it("should return a specific report", async () => {
    let limitCallCount = 0;
    (db.limit as ReturnType<typeof vi.fn>).mockImplementation(() => {
      limitCallCount++;
      if (limitCallCount === 1) {
        return Promise.resolve([{ id: "uuid-user-123" }]);
      }
      return Promise.resolve([{
        id: "report-uuid-1",
        userId: "uuid-user-123",
        weekStart: "2026-06-15",
        weekEnd: "2026-06-21",
        reportText: "Sua semana foi ótima!",
        metrics: { avgSleepHours: 7.5 },
      }]);
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/weekly/report-uuid-1",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.reportText).toBe("Sua semana foi ótima!");
    expect(body.metrics).toHaveProperty("avgSleepHours");
  });

  it("should return 404 when report does not exist", async () => {
    let limitCallCount = 0;
    (db.limit as ReturnType<typeof vi.fn>).mockImplementation(() => {
      limitCallCount++;
      if (limitCallCount === 1) {
        return Promise.resolve([{ id: "uuid-user-123" }]);
      }
      return Promise.resolve([]);
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/weekly/nonexistent-id",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe("Report not found");
  });

  it("should return 404 when report belongs to another user", async () => {
    let limitCallCount = 0;
    (db.limit as ReturnType<typeof vi.fn>).mockImplementation(() => {
      limitCallCount++;
      if (limitCallCount === 1) {
        return Promise.resolve([{ id: "uuid-user-123" }]);
      }
      return Promise.resolve([{
        id: "report-uuid-other",
        userId: "uuid-other-user",
        reportText: "Someone else's report",
      }]);
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/weekly/report-uuid-other",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe("Report not found");
  });

  it("should return 401 without auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/reports/weekly/some-id",
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("POST /api/v1/reports/weekly/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "report-uuid-1" }]);
  });

  it("should generate a weekly report on demand", async () => {
    // The chain for this endpoint:
    // 1) Route: db.select().from().where().limit(1) → user lookup (needs user)
    // 2) aggregateWeeklyMetrics: db.select().from().where() → health events (iterable)
    // 3) notifications count: db.select().from().where() → iterable with count
    // 4) nutrition: db.select().from().where() → iterable
    // 5) prev-week: db.select().from().where().limit(1) → []
    // 6) db.insert().values().returning() → stored report
    let whereCallCount = 0;
    (db.where as ReturnType<typeof vi.fn>).mockImplementation(() => {
      whereCallCount++;
      if (whereCallCount === 1) {
        // User lookup — chain to limit which returns user
        return db;
      }
      // All subsequent where() calls return an empty iterable with .limit()
      return Object.assign([] as unknown[], { limit: vi.fn().mockResolvedValue([]) });
    });
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "uuid-user-123" }]);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/reports/weekly/generate",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.reportText).toBe("Sua semana foi ótima!");
  });

  it("should return 404 when user not found", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/reports/weekly/generate",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 without auth", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/reports/weekly/generate",
    });

    expect(response.statusCode).toBe(401);
  });
});
