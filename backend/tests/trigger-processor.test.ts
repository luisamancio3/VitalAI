import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("Ótimo treino! Descanse e se hidrate."),
}));

vi.mock("../src/config/firebase.js", () => ({
  sendPushNotification: vi.fn().mockResolvedValue("mock-message-id"),
}));

vi.mock("../src/config/database.js", () => {
  const mockRedis = {
    exists: vi.fn().mockResolvedValue(0),
    set: vi.fn().mockResolvedValue("OK"),
    setex: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
  };
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "event-uuid-123" }]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ fcmToken: null }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return { redis: mockRedis, db: mockDb };
});

vi.mock("../src/db/schema.js", () => ({
  healthEvents: { id: "health_events.id" },
  notificationLog: {},
  users: { fcmToken: "users.fcm_token" },
}));

vi.mock("../src/services/notification.service.js", () => ({
  getUserFcmToken: vi.fn().mockResolvedValue(null),
  deliverNotification: vi.fn().mockResolvedValue({ success: true, messageId: "msg-123" }),
}));

vi.mock("../src/services/stress-detection.service.js", () => ({
  assessStress: vi.fn().mockResolvedValue({ score: 45, level: "moderate" }),
}));

import { processEvent, isInQuietHours } from "../src/services/trigger-processor.js";
import { redis, db } from "../src/config/database.js";

describe("TriggerProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 23, 12, 0, 0)); // noon — outside quiet hours
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should process event when not on cooldown", async () => {
    (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue("OK");

    const result = await processEvent({
      userId: "user-123",
      triggerType: "post_workout",
      payload: { duration: 45, type: "running" },
      timestamp: new Date().toISOString(),
    });

    expect(result.processed).toBe(true);
    expect(result.message).toBe("Ótimo treino! Descanse e se hidrate.");
    expect(result.reason).toBeUndefined();
  });

  it("should reject event when on cooldown", async () => {
    (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await processEvent({
      userId: "user-123",
      triggerType: "post_workout",
      payload: { duration: 45 },
      timestamp: new Date().toISOString(),
    });

    expect(result.processed).toBe(false);
    expect(result.message).toBeUndefined();
    expect(result.reason).toBe("cooldown");
  });

  it("should set cooldown key with correct TTL", async () => {
    (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue("OK");

    await processEvent({
      userId: "user-456",
      triggerType: "morning_sleep",
      payload: { hours: 7.5 },
      timestamp: new Date().toISOString(),
    });

    expect(redis.set).toHaveBeenCalledWith(
      "cooldown:user-456:morning_sleep",
      "1",
      "EX",
      86400, // 24 hours
      "NX",
    );
  });

  it("should send notification when user has FCM token", async () => {
    const { getUserFcmToken, deliverNotification } = await import("../src/services/notification.service.js");
    (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue("OK");
    (getUserFcmToken as ReturnType<typeof vi.fn>).mockResolvedValue("fcm-token-abc");
    (deliverNotification as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, messageId: "msg-456" });

    const result = await processEvent({
      userId: "user-with-token",
      triggerType: "low_hrv",
      payload: { hrv: 20 },
      timestamp: new Date().toISOString(),
    });

    expect(result.processed).toBe(true);
    expect(result.message).toBe("Ótimo treino! Descanse e se hidrate.");
    expect(deliverNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-with-token",
        fcmToken: "fcm-token-abc",
      }),
    );
  });

  it("should set correct cooldown for high_heart_rate", async () => {
    (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue("OK");

    await processEvent({
      userId: "user-789",
      triggerType: "high_heart_rate",
      payload: { bpm: 120 },
      timestamp: new Date().toISOString(),
    });

    expect(redis.set).toHaveBeenCalledWith(
      "cooldown:user-789:high_heart_rate",
      "1",
      "EX",
      1800, // 30 minutes
      "NX",
    );
  });

  it("should reject event when trigger type is disabled by user", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{
      notificationPreferences: { disabledTriggers: ["inactivity", "hydration_reminder"] },
    }]);

    const result = await processEvent({
      userId: "user-disabled",
      triggerType: "inactivity",
      payload: {},
      timestamp: new Date().toISOString(),
    });

    expect(result.processed).toBe(false);
    expect(result.reason).toBe("disabled");
  });

  it("should process event when trigger is not in disabled list", async () => {
    (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue("OK");
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{
      notificationPreferences: { disabledTriggers: ["inactivity"] },
    }]);

    const result = await processEvent({
      userId: "user-partial-disable",
      triggerType: "post_workout",
      payload: { duration: 30 },
      timestamp: new Date().toISOString(),
    });

    expect(result.processed).toBe(true);
  });

  it("should return error reason when processing fails", async () => {
    const { generateMessage } = await import("../src/config/claude.js");
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ notificationPreferences: {} }]);
    (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue("OK");
    (generateMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("API timeout"));

    const result = await processEvent({
      userId: "user-error",
      triggerType: "inactivity",
      payload: {},
      timestamp: new Date().toISOString(),
    });

    expect(result.processed).toBe(false);
    expect(result.reason).toBe("error");
  });
});

describe("Gesture rejection feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 23, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should log rejected gesture without generating message", async () => {
    const result = await processEvent({
      userId: "user-gesture-reject",
      triggerType: "meal_detected",
      payload: { confirmed: false, source: "gesture_confirmed", confidence: 0.88 },
      timestamp: new Date().toISOString(),
    });

    expect(result.processed).toBe(false);
    expect(result.reason).toBe("rejected");
    expect(result.message).toBeUndefined();
    expect(db.insert).toHaveBeenCalled();
  });

  it("should process confirmed gesture as normal meal_detected", async () => {
    const { generateMessage } = await import("../src/config/claude.js");
    (generateMessage as ReturnType<typeof vi.fn>).mockResolvedValue("Bom apetite!");
    (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue("OK");
    (db.limit as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ notificationPreferences: {} }])
      .mockResolvedValueOnce([{ count: 0 }]);
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "event-uuid-123" }]);

    const result = await processEvent({
      userId: "user-gesture-confirm",
      triggerType: "meal_detected",
      payload: { confirmed: true, source: "gesture_confirmed", confidence: 0.92 },
      timestamp: new Date().toISOString(),
    });

    expect(result.processed).toBe(true);
    expect(result.message).toBe("Bom apetite!");
  });
});

describe("isInQuietHours", () => {
  it("should detect quiet hours wrapping midnight (22-7)", () => {
    expect(isInQuietHours(23, 22, 7)).toBe(true);
    expect(isInQuietHours(0, 22, 7)).toBe(true);
    expect(isInQuietHours(3, 22, 7)).toBe(true);
    expect(isInQuietHours(6, 22, 7)).toBe(true);
    expect(isInQuietHours(7, 22, 7)).toBe(false);
    expect(isInQuietHours(12, 22, 7)).toBe(false);
    expect(isInQuietHours(21, 22, 7)).toBe(false);
    expect(isInQuietHours(22, 22, 7)).toBe(true);
  });

  it("should detect quiet hours within same day (1-6)", () => {
    expect(isInQuietHours(2, 1, 6)).toBe(true);
    expect(isInQuietHours(5, 1, 6)).toBe(true);
    expect(isInQuietHours(6, 1, 6)).toBe(false);
    expect(isInQuietHours(0, 1, 6)).toBe(false);
    expect(isInQuietHours(12, 1, 6)).toBe(false);
  });
});
