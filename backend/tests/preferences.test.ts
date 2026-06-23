import { describe, it, expect, vi } from "vitest";

vi.mock("../src/config/database.js", () => ({
  redis: {},
  db: {},
}));

vi.mock("../src/db/schema.js", () => ({
  users: {},
}));

vi.mock("../src/middleware/auth.js", () => ({
  authMiddleware: vi.fn(),
}));

import { preferencesSchema } from "../src/routes/preferences.routes.js";

describe("preferencesSchema validation", () => {
  it("should accept valid quiet hours", () => {
    const result = preferencesSchema.safeParse({
      quietHoursStart: 22,
      quietHoursEnd: 7,
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid daily budget", () => {
    const result = preferencesSchema.safeParse({ dailyBudget: 10 });
    expect(result.success).toBe(true);
  });

  it("should accept valid disabled triggers", () => {
    const result = preferencesSchema.safeParse({
      disabledTriggers: ["inactivity", "hydration_reminder"],
    });
    expect(result.success).toBe(true);
  });

  it("should accept all fields together", () => {
    const result = preferencesSchema.safeParse({
      quietHoursStart: 23,
      quietHoursEnd: 6,
      dailyBudget: 8,
      disabledTriggers: ["low_hrv"],
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty object (all optional)", () => {
    const result = preferencesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should reject quietHoursStart above 23", () => {
    const result = preferencesSchema.safeParse({ quietHoursStart: 24 });
    expect(result.success).toBe(false);
  });

  it("should reject negative quietHoursEnd", () => {
    const result = preferencesSchema.safeParse({ quietHoursEnd: -1 });
    expect(result.success).toBe(false);
  });

  it("should reject non-integer quiet hours", () => {
    const result = preferencesSchema.safeParse({ quietHoursStart: 22.5 });
    expect(result.success).toBe(false);
  });

  it("should reject dailyBudget below 1", () => {
    const result = preferencesSchema.safeParse({ dailyBudget: 0 });
    expect(result.success).toBe(false);
  });

  it("should reject dailyBudget above 20", () => {
    const result = preferencesSchema.safeParse({ dailyBudget: 21 });
    expect(result.success).toBe(false);
  });

  it("should reject invalid trigger type in disabledTriggers", () => {
    const result = preferencesSchema.safeParse({
      disabledTriggers: ["post_workout", "invalid_trigger"],
    });
    expect(result.success).toBe(false);
  });

  it("should accept all valid trigger types", () => {
    const result = preferencesSchema.safeParse({
      disabledTriggers: [
        "post_workout",
        "morning_sleep",
        "low_hrv",
        "high_heart_rate",
        "meal_detected",
        "inactivity",
        "hydration_reminder",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty disabledTriggers array", () => {
    const result = preferencesSchema.safeParse({ disabledTriggers: [] });
    expect(result.success).toBe(true);
  });

  it("should reject string dailyBudget", () => {
    const result = preferencesSchema.safeParse({ dailyBudget: "five" });
    expect(result.success).toBe(false);
  });
});
