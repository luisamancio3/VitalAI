import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config/firebase.js", () => ({
  sendPushNotification: vi.fn().mockResolvedValue("fcm-msg-id-001"),
}));

vi.mock("../src/config/database.js", () => {
  const mockDb: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ["select", "from", "where"];
  for (const m of chainMethods) {
    mockDb[m] = vi.fn().mockReturnValue(mockDb);
  }
  mockDb.limit = vi.fn().mockResolvedValue([]);
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue("OK"),
  };
  return { db: mockDb, redis: mockRedis };
});

vi.mock("../src/db/schema.js", () => ({
  users: { id: "users.id", fcmToken: "users.fcm_token" },
}));

import { deliverNotification, getUserFcmToken } from "../src/services/notification.service.js";
import { sendPushNotification } from "../src/config/firebase.js";
import { db, redis } from "../src/config/database.js";

describe("deliverNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should deliver notification and return messageId", async () => {
    const result = await deliverNotification({
      userId: "user-123",
      fcmToken: "fcm-token-abc",
      title: "Test Title",
      body: "Test body message",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.messageId).toBe("fcm-msg-id-001");
    }
    expect(sendPushNotification).toHaveBeenCalledWith(
      "fcm-token-abc",
      "Test Title",
      "Test body message",
      undefined,
    );
  });

  it("should pass data payload to FCM", async () => {
    await deliverNotification({
      userId: "user-123",
      fcmToken: "fcm-token-abc",
      title: "Report",
      body: "Your report is ready",
      data: { type: "weekly_report", reportId: "r-1" },
    });

    expect(sendPushNotification).toHaveBeenCalledWith(
      "fcm-token-abc",
      "Report",
      "Your report is ready",
      { type: "weekly_report", reportId: "r-1" },
    );
  });

  it("should return failure when FCM throws", async () => {
    (sendPushNotification as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("messaging/invalid-registration-token"),
    );

    const result = await deliverNotification({
      userId: "user-123",
      fcmToken: "invalid-token",
      title: "Test",
      body: "Test",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(Error);
    }
  });
});

describe("getUserFcmToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return cached token from Redis", async () => {
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue("cached-fcm-token");

    const token = await getUserFcmToken("user-123");

    expect(token).toBe("cached-fcm-token");
    expect(db.select).not.toHaveBeenCalled();
  });

  it("should query database when Redis cache misses", async () => {
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ fcmToken: "db-fcm-token" }]);

    const token = await getUserFcmToken("user-456");

    expect(token).toBe("db-fcm-token");
    expect(db.select).toHaveBeenCalled();
  });

  it("should cache token in Redis after DB lookup", async () => {
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ fcmToken: "new-token" }]);

    await getUserFcmToken("user-789");

    expect(redis.setex).toHaveBeenCalledWith("fcm:user-789", 300, "new-token");
  });

  it("should return null when user has no FCM token", async () => {
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ fcmToken: null }]);

    const token = await getUserFcmToken("user-no-token");

    expect(token).toBeNull();
    expect(redis.setex).not.toHaveBeenCalled();
  });

  it("should return null when user not found", async () => {
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const token = await getUserFcmToken("nonexistent-user");

    expect(token).toBeNull();
  });

  it("should fall through to DB when Redis is unavailable", async () => {
    (redis.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Redis connection refused"));
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ fcmToken: "fallback-token" }]);

    const token = await getUserFcmToken("user-redis-down");

    expect(token).toBe("fallback-token");
  });

  it("should not throw when Redis cache write fails", async () => {
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ fcmToken: "token-abc" }]);
    (redis.setex as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Redis write failed"));

    const token = await getUserFcmToken("user-cache-fail");

    expect(token).toBe("token-abc");
  });
});
