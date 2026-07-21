import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("Beba água!"),
}));

vi.mock("../src/config/database.js", () => {
  const mockDb: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ["select", "from", "where", "insert", "values", "update", "set", "orderBy", "groupBy"];
  for (const m of chainMethods) {
    mockDb[m] = vi.fn().mockReturnValue(mockDb);
  }
  mockDb.limit = vi.fn().mockResolvedValue([]);
  mockDb.returning = vi.fn().mockResolvedValue([{ id: "hydration-uuid" }]);
  return { db: mockDb, redis: { get: vi.fn(), set: vi.fn(), setex: vi.fn() } };
});

vi.mock("../src/db/schema.js", () => ({
  hydrationLogs: {
    id: "hydration_logs.id",
    userId: "hydration_logs.user_id",
    amountMl: "hydration_logs.amount_ml",
    source: "hydration_logs.source",
    createdAt: "hydration_logs.created_at",
  },
  healthEvents: { id: "health_events.id", userId: "health_events.user_id", triggerType: "health_events.trigger_type", createdAt: "health_events.created_at" },
  users: { id: "users.id" },
  notificationLog: {},
  stressScores: { id: "stress_scores.id" },
}));

vi.mock("../src/services/notification.service.js", () => ({
  getUserFcmToken: vi.fn().mockResolvedValue(null),
  deliverNotification: vi.fn().mockResolvedValue({ success: true, messageId: "m" }),
}));

import { calculateSmartInterval, shouldSendReminder } from "../src/services/hydration.service.js";

function makeStatus(overrides: Partial<{
  todayTotalMl: number;
  goalMl: number;
  progress: number;
  lastIntakeAt: string | null;
  nextReminderIn: number | null;
}> = {}) {
  return {
    todayTotalMl: 500,
    goalMl: 2500,
    progress: 0.2,
    lastIntakeAt: new Date().toISOString(),
    nextReminderIn: 0,
    logs: [],
    ...overrides,
  };
}

describe("calculateSmartInterval", () => {
  it("should return base interval for normal conditions", () => {
    const interval = calculateSmartInterval({
      minutesSinceLastIntake: 60,
      recentWorkout: false,
      currentHour: 12,
      todayProgress: 0.4,
    });
    expect(interval).toBeGreaterThanOrEqual(45);
    expect(interval).toBeLessThanOrEqual(150);
  });

  it("should shorten interval after workout", () => {
    const normal = calculateSmartInterval({
      minutesSinceLastIntake: 60,
      recentWorkout: false,
      currentHour: 12,
      todayProgress: 0.4,
    });
    const postWorkout = calculateSmartInterval({
      minutesSinceLastIntake: 60,
      recentWorkout: true,
      currentHour: 12,
      todayProgress: 0.4,
    });
    expect(postWorkout).toBeLessThan(normal);
  });

  it("should shorten interval during hot hours", () => {
    const morning = calculateSmartInterval({
      minutesSinceLastIntake: 60,
      recentWorkout: false,
      currentHour: 8,
      todayProgress: 0.4,
    });
    const midday = calculateSmartInterval({
      minutesSinceLastIntake: 60,
      recentWorkout: false,
      currentHour: 13,
      todayProgress: 0.4,
    });
    expect(midday).toBeLessThan(morning);
  });

  it("should shorten interval when behind on goal in afternoon", () => {
    const onTrack = calculateSmartInterval({
      minutesSinceLastIntake: 60,
      recentWorkout: false,
      currentHour: 15,
      todayProgress: 0.6,
    });
    const behind = calculateSmartInterval({
      minutesSinceLastIntake: 60,
      recentWorkout: false,
      currentHour: 15,
      todayProgress: 0.3,
    });
    expect(behind).toBeLessThan(onTrack);
  });

  it("should lengthen interval when ahead of goal", () => {
    const normal = calculateSmartInterval({
      minutesSinceLastIntake: 60,
      recentWorkout: false,
      currentHour: 12,
      todayProgress: 0.5,
    });
    const ahead = calculateSmartInterval({
      minutesSinceLastIntake: 60,
      recentWorkout: false,
      currentHour: 12,
      todayProgress: 0.9,
    });
    expect(ahead).toBeGreaterThan(normal);
  });

  it("should never go below minimum interval", () => {
    const interval = calculateSmartInterval({
      minutesSinceLastIntake: 10,
      recentWorkout: true,
      currentHour: 15,
      todayProgress: 0.1,
    });
    expect(interval).toBeGreaterThanOrEqual(45);
  });

  it("should never exceed maximum interval", () => {
    const interval = calculateSmartInterval({
      minutesSinceLastIntake: 300,
      recentWorkout: false,
      currentHour: 8,
      todayProgress: 0.95,
    });
    expect(interval).toBeLessThanOrEqual(150);
  });

  it("should combine workout + hot hours for shortest interval", () => {
    const combined = calculateSmartInterval({
      minutesSinceLastIntake: 60,
      recentWorkout: true,
      currentHour: 14,
      todayProgress: 0.2,
    });
    expect(combined).toBe(45); // hits minimum
  });
});

describe("shouldSendReminder", () => {
  it("never reminds once the daily goal is met", () => {
    const status = makeStatus({ progress: 1.0, nextReminderIn: 0 });
    expect(shouldSendReminder(status, 15)).toBe(false);
  });

  it("reminds when no intake logged and morning is underway (>=9h)", () => {
    const status = makeStatus({ lastIntakeAt: null, progress: 0 });
    expect(shouldSendReminder(status, 10)).toBe(true);
  });

  it("stays quiet before 9am when no intake logged", () => {
    const status = makeStatus({ lastIntakeAt: null, progress: 0 });
    expect(shouldSendReminder(status, 7)).toBe(false);
  });

  it("reminds when the countdown has elapsed (nextReminderIn <= 0)", () => {
    const status = makeStatus({ nextReminderIn: 0 });
    expect(shouldSendReminder(status, 15)).toBe(true);
  });

  it("waits while the countdown is still running (nextReminderIn > 0)", () => {
    const status = makeStatus({ nextReminderIn: 40 });
    expect(shouldSendReminder(status, 15)).toBe(false);
  });
});
