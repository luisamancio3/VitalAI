import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing
vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("Hora do almoço! Que tal uma refeição nutritiva?"),
}));

vi.mock("../src/config/firebase.js", () => ({
  sendPushNotification: vi.fn().mockResolvedValue("mock-message-id"),
}));

vi.mock("../src/config/database.js", () => {
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    setex: vi.fn().mockResolvedValue("OK"),
    exists: vi.fn().mockResolvedValue(0),
  };
  // Build a chainable mock where every method returns the mock itself,
  // except terminal methods (limit, returning) which resolve data.
  const mockDb: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ["select", "from", "where", "update", "set", "insert", "values", "groupBy", "having"];
  for (const m of chainMethods) {
    mockDb[m] = vi.fn().mockReturnValue(mockDb);
  }
  mockDb.limit = vi.fn().mockResolvedValue([{ id: "user-123", notificationPreferences: {}, fcmToken: null }]);
  mockDb.returning = vi.fn().mockResolvedValue([{ id: "event-uuid-123" }]);
  return { redis: mockRedis, db: mockDb };
});

vi.mock("../src/db/schema.js", () => ({
  users: { id: "users.id", fcmToken: "users.fcm_token" },
  nutritionProfiles: { userId: "nutrition_profiles.user_id" },
  healthEvents: { id: "health_events.id" },
  notificationLog: {},
  mealFeedback: {},
}));

vi.mock("../src/services/notification.service.js", () => ({
  getUserFcmToken: vi.fn().mockResolvedValue(null),
  deliverNotification: vi.fn().mockResolvedValue({ success: true, messageId: "msg-123" }),
}));

import { getCurrentMealWindow, checkMealRoutines } from "../src/services/meal-routine.service.js";
import { redis, db } from "../src/config/database.js";

describe("getCurrentMealWindow", () => {
  it("should return breakfast window at 7:30", () => {
    const result = getCurrentMealWindow(7, 30);
    expect(result).not.toBeNull();
    expect(result!.context).toBe("breakfast");
    expect(result!.name).toBe("café da manhã");
  });

  it("should return lunch window at 12:00", () => {
    const result = getCurrentMealWindow(12, 0);
    expect(result).not.toBeNull();
    expect(result!.context).toBe("lunch");
  });

  it("should return lunch window at 11:30 (start boundary)", () => {
    const result = getCurrentMealWindow(11, 30);
    expect(result).not.toBeNull();
    expect(result!.context).toBe("lunch");
  });

  it("should return dinner window at 20:00", () => {
    const result = getCurrentMealWindow(20, 0);
    expect(result).not.toBeNull();
    expect(result!.context).toBe("dinner");
  });

  it("should return null at 15:00 (no meal window)", () => {
    const result = getCurrentMealWindow(15, 0);
    expect(result).toBeNull();
  });

  it("should return null at 6:59 (before breakfast)", () => {
    const result = getCurrentMealWindow(6, 59);
    expect(result).toBeNull();
  });

  it("should return null at 9:00 (breakfast end boundary, exclusive)", () => {
    const result = getCurrentMealWindow(9, 0);
    expect(result).toBeNull();
  });

  it("should return null at 13:00 (lunch end boundary, exclusive)", () => {
    const result = getCurrentMealWindow(13, 0);
    expect(result).toBeNull();
  });

  it("should return null at 21:00 (dinner end boundary, exclusive)", () => {
    const result = getCurrentMealWindow(21, 0);
    expect(result).toBeNull();
  });

  it("should return null at 3:00 AM", () => {
    const result = getCurrentMealWindow(3, 0);
    expect(result).toBeNull();
  });
});

describe("checkMealRoutines", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: Redis says not yet prompted today
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue("OK");
    (redis.setex as ReturnType<typeof vi.fn>).mockResolvedValue("OK");

    // Default: one user with a nutrition profile
    (db.from as ReturnType<typeof vi.fn>).mockResolvedValue([{ userId: "user-123" }]);

    // Default: user lookup + notification prefs for processEvent
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "user-123", notificationPreferences: {} }]);
  });

  it("should return 0 when outside any meal window", async () => {
    // Mock Date to 15:00 (no meal window)
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 22, 15, 0, 0));

    const count = await checkMealRoutines();
    expect(count).toBe(0);

    vi.useRealTimers();
  });

  it("should prompt users during a meal window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 22, 12, 0, 0));

    const count = await checkMealRoutines();
    expect(count).toBe(1);

    vi.useRealTimers();
  });

  it("should skip user already prompted today", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 22, 12, 0, 0));

    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue("1");

    const count = await checkMealRoutines();
    expect(count).toBe(0);

    vi.useRealTimers();
  });

  it("should set Redis key after successful prompt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 22, 12, 0, 0));

    await checkMealRoutines();

    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringContaining("meal_routine:user-123:lunch:2026-06-22"),
      expect.any(Number),
      "1",
    );

    vi.useRealTimers();
  });

  it("should include routine source in event payload", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 22, 7, 30, 0));

    // Spy on db.insert to capture the payload passed to processEvent -> db.insert
    const insertValues = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "ev-1" }]) });
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: insertValues });

    await checkMealRoutines();

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerType: "meal_detected",
        payload: expect.objectContaining({
          source: "routine",
          mealWindow: "breakfast",
        }),
      }),
    );

    vi.useRealTimers();
  });

  it("should continue processing when one user fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 22, 12, 0, 0));

    (db.from as ReturnType<typeof vi.fn>).mockResolvedValue([
      { userId: "user-ok" },
      { userId: "user-fail" },
      { userId: "user-ok-2" },
    ]);

    let callCount = 0;
    (redis.get as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 2) throw new Error("Redis connection lost");
      return Promise.resolve(null);
    });

    const count = await checkMealRoutines();
    expect(count).toBe(2);

    vi.useRealTimers();
  });

  it("should return 0 when no users have nutrition profiles", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 22, 12, 0, 0));

    (db.from as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const count = await checkMealRoutines();
    expect(count).toBe(0);

    vi.useRealTimers();
  });
});
