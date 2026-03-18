import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { processEvent } from "../src/services/trigger-processor.js";
import { redis } from "../src/config/database.js";

describe("TriggerProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process event when not on cooldown", async () => {
    (redis.exists as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const result = await processEvent({
      userId: "user-123",
      triggerType: "post_workout",
      payload: { duration: 45, type: "running" },
      timestamp: new Date().toISOString(),
    });

    expect(result.processed).toBe(true);
    expect(result.message).toBeDefined();
  });

  it("should reject event when on cooldown", async () => {
    (redis.exists as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    const result = await processEvent({
      userId: "user-123",
      triggerType: "post_workout",
      payload: { duration: 45 },
      timestamp: new Date().toISOString(),
    });

    expect(result.processed).toBe(false);
    expect(result.message).toBeUndefined();
  });

  it("should set cooldown key with correct TTL", async () => {
    (redis.exists as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await processEvent({
      userId: "user-456",
      triggerType: "morning_sleep",
      payload: { hours: 7.5 },
      timestamp: new Date().toISOString(),
    });

    expect(redis.setex).toHaveBeenCalledWith(
      "cooldown:user-456:morning_sleep",
      86400, // 24 hours
      "1",
    );
  });

  it("should set correct cooldown for high_heart_rate", async () => {
    (redis.exists as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await processEvent({
      userId: "user-789",
      triggerType: "high_heart_rate",
      payload: { bpm: 120 },
      timestamp: new Date().toISOString(),
    });

    expect(redis.setex).toHaveBeenCalledWith(
      "cooldown:user-789:high_heart_rate",
      1800, // 30 minutes
      "1",
    );
  });
});
