import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("Ótima semana, Luis! Você dormiu bem e treinou 3 vezes."),
}));

vi.mock("../src/config/firebase.js", () => ({
  sendPushNotification: vi.fn().mockResolvedValue("mock-message-id"),
}));

// Build an array-like result that also has a .limit() method for chaining.
// This lets `await db.select().from().where()` be iterable AND
// `db.select().from().where().limit(1)` work for prev-week queries.
function makeResult(items: unknown[] = []) {
  const arr = [...items];
  (arr as any).limit = vi.fn().mockResolvedValue([]);
  return arr;
}

vi.mock("../src/config/database.js", () => {
  const mockDb: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ["select", "from", "insert", "values", "orderBy", "groupBy", "having", "update", "set"];
  for (const m of chainMethods) {
    mockDb[m] = vi.fn().mockReturnValue(mockDb);
  }
  mockDb.where = vi.fn().mockReturnValue(makeResult());
  mockDb.limit = vi.fn().mockResolvedValue([]);
  mockDb.returning = vi.fn().mockResolvedValue([{ id: "report-uuid-001" }]);
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue("OK"),
  };
  return { db: mockDb, redis: mockRedis };
});

vi.mock("../src/db/schema.js", () => ({
  healthEvents: { userId: "health_events.user_id", createdAt: "health_events.created_at", triggerType: "health_events.trigger_type" },
  weeklyReports: { id: "weekly_reports.id", userId: "weekly_reports.user_id", weekStart: "weekly_reports.week_start", metrics: "weekly_reports.metrics" },
  notificationLog: { userId: "notification_log.user_id", delivered: "notification_log.delivered", createdAt: "notification_log.created_at" },
  mealFeedback: { userId: "meal_feedback.user_id", createdAt: "meal_feedback.created_at" },
  users: { id: "users.id", fcmToken: "users.fcm_token" },
}));

vi.mock("../src/services/notification.service.js", () => ({
  getUserFcmToken: vi.fn().mockResolvedValue(null),
  deliverNotification: vi.fn().mockResolvedValue({ success: true, messageId: "msg-report-001" }),
}));

import { generateWeeklyReport, generateReportsForAllUsers } from "../src/services/report-generator.js";
import { generateMessage } from "../src/config/claude.js";
import { db } from "../src/config/database.js";
import { getUserFcmToken, deliverNotification } from "../src/services/notification.service.js";

describe("generateWeeklyReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: where() returns an empty iterable with .limit() stub.
    // Call order inside aggregateWeeklyMetrics:
    //   1) health events query  → where() returns iterable
    //   2) notification count   → where() returns iterable
    //   3) meal feedback        → where() returns iterable
    //   4) prev-week report     → where().limit(1) → limit resolves to []
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(makeResult());
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "report-uuid-001" }]);
  });

  it("should generate a report and return text", async () => {
    const result = await generateWeeklyReport("user-123");

    expect(result).toBe("Ótima semana, Luis! Você dormiu bem e treinou 3 vezes.");
    expect(generateMessage).toHaveBeenCalledOnce();
  });

  it("should pass the weekly report system prompt to Claude", async () => {
    await generateWeeklyReport("user-123");

    expect(generateMessage).toHaveBeenCalledWith(
      expect.stringContaining("VitalAI"),
      expect.any(String),
    );
  });

  it("should include nutrition section in system prompt", async () => {
    await generateWeeklyReport("user-123");

    expect(generateMessage).toHaveBeenCalledWith(
      expect.stringContaining("Nutrition summary"),
      expect.any(String),
    );
  });

  it("should include week-over-week section in system prompt", async () => {
    await generateWeeklyReport("user-123");

    expect(generateMessage).toHaveBeenCalledWith(
      expect.stringContaining("Week-over-week comparison"),
      expect.any(String),
    );
  });

  it("should pass metrics with nutrition and comparison fields to Claude", async () => {
    await generateWeeklyReport("user-123");

    const metricsArg = (generateMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const metrics = JSON.parse(metricsArg);
    expect(metrics).toHaveProperty("avgHeartRate");
    expect(metrics).toHaveProperty("avgHrv");
    expect(metrics).toHaveProperty("workoutCount");
    expect(metrics).toHaveProperty("avgSleepHours");
    expect(metrics).toHaveProperty("notificationCount");
    expect(metrics).toHaveProperty("eventsByType");
    expect(metrics).toHaveProperty("nutrition");
    expect(metrics.nutrition).toHaveProperty("mealsLogged");
    expect(metrics.nutrition).toHaveProperty("avgRating");
    expect(metrics.nutrition).toHaveProperty("topContext");
    expect(metrics).toHaveProperty("comparison");
  });

  it("should store the report in the database", async () => {
    await generateWeeklyReport("user-123");

    expect(db.insert).toHaveBeenCalledOnce();
    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        reportText: "Ótima semana, Luis! Você dormiu bem e treinou 3 vezes.",
      }),
    );
  });

  it("should use fallback report when Claude fails", async () => {
    (generateMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("API timeout"));

    const result = await generateWeeklyReport("user-123");

    expect(result).toContain("resumo da sua semana");
    expect(result).toContain("Continue assim");
  });

  it("should send push notification when user has FCM token", async () => {
    (getUserFcmToken as ReturnType<typeof vi.fn>).mockResolvedValue("fcm-token-abc");

    await generateWeeklyReport("user-with-token");

    expect(deliverNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-with-token",
        fcmToken: "fcm-token-abc",
        title: "Relatório Semanal",
        data: expect.objectContaining({ type: "weekly_report" }),
      }),
    );
  });

  it("should not send push notification when user has no FCM token", async () => {
    (getUserFcmToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await generateWeeklyReport("user-no-token");

    expect(deliverNotification).not.toHaveBeenCalled();
  });

  it("should aggregate health event metrics from payloads", async () => {
    // First where() call = health events query → return event data
    // Subsequent where() calls → empty makeResult (default chaining)
    (db.where as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeResult([
        { triggerType: "morning_sleep", payload: { hours: 7.5 } },
        { triggerType: "morning_sleep", payload: { hours: 6.0 } },
        { triggerType: "post_workout", payload: { durationMinutes: 45 } },
        { triggerType: "post_workout", payload: { durationMinutes: 30 } },
        { triggerType: "high_heart_rate", payload: { currentBPM: 110 } },
        { triggerType: "low_hrv", payload: { currentHRV: 25 } },
      ]))
      .mockReturnValue(makeResult());

    await generateWeeklyReport("user-active");

    const metricsArg = (generateMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const metrics = JSON.parse(metricsArg);
    expect(metrics.avgSleepHours).toBe(6.8);
    expect(metrics.workoutCount).toBe(2);
    expect(metrics.avgHeartRate).toBe(110);
    expect(metrics.avgHrv).toBe(25);
    expect(metrics.eventsByType).toEqual({
      morning_sleep: 2,
      post_workout: 2,
      high_heart_rate: 1,
      low_hrv: 1,
    });
  });

  it("should return null metrics when no events exist", async () => {
    await generateWeeklyReport("user-inactive");

    const metricsArg = (generateMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const metrics = JSON.parse(metricsArg);
    expect(metrics.avgHeartRate).toBeNull();
    expect(metrics.avgHrv).toBeNull();
    expect(metrics.avgSleepHours).toBeNull();
    expect(metrics.workoutCount).toBe(0);
    expect(metrics.nutrition.mealsLogged).toBe(0);
    expect(metrics.nutrition.avgRating).toBeNull();
  });

  it("should aggregate nutrition metrics from meal feedback", async () => {
    // where() call order: 1=health events, 2=notification count, 3=meal feedback, 4=prev report
    let whereCallCount = 0;
    (db.where as ReturnType<typeof vi.fn>).mockImplementation(() => {
      whereCallCount++;
      if (whereCallCount === 3) {
        // meal feedback query — return feedback rows (iterable, with .limit())
        return makeResult([
          { rating: 4, context: "lunch" },
          { rating: 5, context: "lunch" },
          { rating: 3, context: "dinner" },
        ]);
      }
      // All other calls — empty iterable with .limit()
      return makeResult();
    });

    await generateWeeklyReport("user-nutrition");

    const metricsArg = (generateMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const metrics = JSON.parse(metricsArg);
    expect(metrics.nutrition.mealsLogged).toBe(3);
    expect(metrics.nutrition.avgRating).toBe(4);
    expect(metrics.nutrition.topContext).toBe("lunch");
  });

  it("should include comparison with previous week when available", async () => {
    let whereCallCount = 0;
    (db.where as ReturnType<typeof vi.fn>).mockImplementation(() => {
      whereCallCount++;
      if (whereCallCount === 4) {
        // prev-week report query — needs .limit(1) to return prev report
        const result = makeResult();
        (result as any).limit = vi.fn().mockResolvedValue([{
          metrics: {
            avgSleepHours: 6.0,
            workoutCount: 1,
            nutrition: { mealsLogged: 2 },
          },
        }]);
        return result;
      }
      return makeResult();
    });

    await generateWeeklyReport("user-compare");

    const metricsArg = (generateMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const metrics = JSON.parse(metricsArg);
    expect(metrics.comparison).not.toBeNull();
    expect(metrics.comparison).toHaveProperty("sleepDelta");
    expect(metrics.comparison).toHaveProperty("workoutDelta");
    expect(metrics.comparison).toHaveProperty("mealsDelta");
    expect(metrics.comparison).toHaveProperty("trend");
  });

  it("should set comparison to null when no previous week report exists", async () => {
    await generateWeeklyReport("user-first-week");

    const metricsArg = (generateMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const metrics = JSON.parse(metricsArg);
    expect(metrics.comparison).toBeNull();
  });

  it("should include nutrition in fallback report", async () => {
    let whereCallCount = 0;
    (db.where as ReturnType<typeof vi.fn>).mockImplementation(() => {
      whereCallCount++;
      if (whereCallCount === 3) {
        return makeResult([
          { rating: 4, context: "lunch" },
          { rating: 5, context: "dinner" },
        ]);
      }
      return makeResult();
    });
    (generateMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("API down"));

    const result = await generateWeeklyReport("user-fallback");

    expect(result).toContain("2 refeições");
  });
});

describe("generateReportsForAllUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(makeResult());
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "report-uuid" }]);
  });

  it("should generate reports for all users and return count", async () => {
    (db.from as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: "user-1" },
      { id: "user-2" },
      { id: "user-3" },
    ]);

    const count = await generateReportsForAllUsers();

    expect(count).toBe(3);
  });

  it("should continue generating reports when one user fails", async () => {
    (db.from as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: "user-ok-1" },
      { id: "user-fail" },
      { id: "user-ok-2" },
    ]);

    let callCount = 0;
    (db.returning as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 2) throw new Error("DB constraint error");
      return Promise.resolve([{ id: "report-uuid" }]);
    });

    const count = await generateReportsForAllUsers();

    expect(count).toBe(2);
  });

  it("should return 0 when no users exist", async () => {
    (db.from as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const count = await generateReportsForAllUsers();

    expect(count).toBe(0);
  });
});
