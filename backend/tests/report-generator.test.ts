import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("Ótima semana, Luis! Você dormiu bem e treinou 3 vezes."),
}));

vi.mock("../src/config/firebase.js", () => ({
  sendPushNotification: vi.fn().mockResolvedValue("mock-message-id"),
}));

vi.mock("../src/config/database.js", () => {
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "report-uuid-001" }]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue("OK"),
  };
  return { db: mockDb, redis: mockRedis };
});

vi.mock("../src/db/schema.js", () => ({
  healthEvents: { userId: "health_events.user_id", createdAt: "health_events.created_at", triggerType: "health_events.trigger_type" },
  weeklyReports: { id: "weekly_reports.id", userId: "weekly_reports.user_id" },
  notificationLog: { userId: "notification_log.user_id", delivered: "notification_log.delivered", createdAt: "notification_log.created_at" },
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

    // Default: no events this week, no notifications
    (db.where as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // Notification count query returns 0
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // Insert report returns id
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

  it("should pass aggregated metrics as JSON to Claude", async () => {
    await generateWeeklyReport("user-123");

    const metricsArg = (generateMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const metrics = JSON.parse(metricsArg);
    expect(metrics).toHaveProperty("avgHeartRate");
    expect(metrics).toHaveProperty("avgHrv");
    expect(metrics).toHaveProperty("workoutCount");
    expect(metrics).toHaveProperty("avgSleepHours");
    expect(metrics).toHaveProperty("notificationCount");
    expect(metrics).toHaveProperty("eventsByType");
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

  it("should aggregate metrics from health events", async () => {
    (db.where as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { triggerType: "morning_sleep", payload: { hours: 7.5 } },
      { triggerType: "morning_sleep", payload: { hours: 6.0 } },
      { triggerType: "post_workout", payload: { durationMinutes: 45 } },
      { triggerType: "post_workout", payload: { durationMinutes: 30 } },
      { triggerType: "high_heart_rate", payload: { currentBPM: 110 } },
      { triggerType: "low_hrv", payload: { currentHRV: 25 } },
    ]);

    await generateWeeklyReport("user-active");

    const metricsArg = (generateMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const metrics = JSON.parse(metricsArg);
    expect(metrics.avgSleepHours).toBe(6.8); // (7.5 + 6.0) / 2 rounded to 1 decimal
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
    (db.where as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    await generateWeeklyReport("user-inactive");

    const metricsArg = (generateMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const metrics = JSON.parse(metricsArg);
    expect(metrics.avgHeartRate).toBeNull();
    expect(metrics.avgHrv).toBeNull();
    expect(metrics.avgSleepHours).toBeNull();
    expect(metrics.workoutCount).toBe(0);
  });

  it("should include fallback sleep info in fallback report", async () => {
    (db.where as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { triggerType: "morning_sleep", payload: { hours: 7.0 } },
      { triggerType: "post_workout", payload: { durationMinutes: 40 } },
    ]);
    (generateMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("API down"));

    const result = await generateWeeklyReport("user-fallback");

    expect(result).toContain("7 horas");
    expect(result).toContain("1 treino");
  });
});

describe("generateReportsForAllUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.where as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "report-uuid" }]);
  });

  it("should generate reports for all users and return count", async () => {
    // Mock db.select().from(users) to return user list
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

    // Fail on the second user's insert
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
