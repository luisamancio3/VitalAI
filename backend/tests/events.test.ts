import { describe, it, expect, vi } from "vitest";

// Mock transitive dependencies so importing events.routes.js doesn't require env vars
vi.mock("../src/config/database.js", () => ({
  redis: {},
  db: {},
}));

vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn(),
}));

vi.mock("../src/db/schema.js", () => ({
  healthEvents: {},
  notificationLog: {},
  users: {},
}));

vi.mock("../src/services/notification.service.js", () => ({
  getUserFcmToken: vi.fn(),
  deliverNotification: vi.fn(),
}));

vi.mock("../src/middleware/auth.js", () => ({
  authMiddleware: vi.fn(),
}));

import { eventSchema } from "../src/routes/events.routes.js";

describe("Event Zod Validation", () => {
  it("should accept a valid event body", () => {
    const validEvent = {
      triggerType: "post_workout",
      payload: { duration: 45, type: "running" },
      timestamp: "2026-03-18T10:00:00.000Z",
    };

    const result = eventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("should reject an invalid triggerType", () => {
    const invalidEvent = {
      triggerType: "unknown_trigger",
      payload: { data: "test" },
      timestamp: "2026-03-18T10:00:00.000Z",
    };

    const result = eventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it("should reject a missing timestamp", () => {
    const missingTimestamp = {
      triggerType: "low_hrv",
      payload: { hrv: 25 },
    };

    const result = eventSchema.safeParse(missingTimestamp);
    expect(result.success).toBe(false);
  });

  it("should reject an invalid payload type", () => {
    const invalidPayload = {
      triggerType: "morning_sleep",
      payload: "not an object",
      timestamp: "2026-03-18T10:00:00.000Z",
    };

    const result = eventSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it("should reject an invalid timestamp format", () => {
    const invalidTimestamp = {
      triggerType: "inactivity",
      payload: {},
      timestamp: "not-a-date",
    };

    const result = eventSchema.safeParse(invalidTimestamp);
    expect(result.success).toBe(false);
  });

  it("should accept all valid trigger types", () => {
    const triggers = [
      "post_workout",
      "morning_sleep",
      "low_hrv",
      "high_heart_rate",
      "meal_detected",
      "inactivity",
      "hydration_reminder",
    ];

    for (const triggerType of triggers) {
      const result = eventSchema.safeParse({
        triggerType,
        payload: {},
        timestamp: "2026-03-18T10:00:00.000Z",
      });
      expect(result.success).toBe(true);
    }
  });
});
