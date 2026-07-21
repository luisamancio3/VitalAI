import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("Respire fundo e relaxe."),
}));

vi.mock("../src/config/database.js", () => {
  const mockDb: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ["select", "from", "where", "insert", "values", "orderBy"];
  for (const m of chainMethods) {
    mockDb[m] = vi.fn().mockReturnValue(mockDb);
  }
  mockDb.limit = vi.fn().mockResolvedValue([]);
  mockDb.returning = vi.fn().mockResolvedValue([{ id: "stress-uuid" }]);
  return { db: mockDb, redis: { get: vi.fn(), set: vi.fn(), setex: vi.fn() } };
});

vi.mock("../src/db/schema.js", () => ({
  stressScores: { id: "stress_scores.id", userId: "stress_scores.user_id", createdAt: "stress_scores.created_at" },
  healthEvents: { id: "health_events.id" },
  users: { id: "users.id" },
}));

import {
  calculateStressScore,
  getTimeOfDayFactor,
  getBreathingExercises,
} from "../src/services/stress-detection.service.js";

describe("calculateStressScore", () => {
  it("should return low stress for good metrics", () => {
    const result = calculateStressScore({
      hrvDeviation: 5,
      heartRateElevation: 3,
      timeOfDayFactor: 0.2,
      recentActivityLevel: 0.5,
    });
    expect(result.score).toBeLessThanOrEqual(25);
    expect(result.level).toBe("low");
  });

  it("should return moderate stress for elevated metrics", () => {
    const result = calculateStressScore({
      hrvDeviation: 30,
      heartRateElevation: 20,
      timeOfDayFactor: 0.7,
      recentActivityLevel: 0.1,
    });
    expect(result.score).toBeGreaterThan(25);
    expect(result.score).toBeLessThanOrEqual(50);
    expect(result.level).toBe("moderate");
  });

  it("should return high stress for poor metrics", () => {
    const result = calculateStressScore({
      hrvDeviation: 60,
      heartRateElevation: 40,
      timeOfDayFactor: 0.8,
      recentActivityLevel: 0,
    });
    expect(result.score).toBeGreaterThan(50);
    expect(result.level).toBe("high");
  });

  it("should return very_high stress for extreme deviation", () => {
    const result = calculateStressScore({
      hrvDeviation: 90,
      heartRateElevation: 80,
      timeOfDayFactor: 1.0,
      recentActivityLevel: 0,
    });
    expect(result.score).toBeGreaterThan(75);
    expect(result.level).toBe("very_high");
  });

  it("should reduce stress score with high activity level", () => {
    const baseResult = calculateStressScore({
      hrvDeviation: 40,
      heartRateElevation: 30,
      timeOfDayFactor: 0.5,
      recentActivityLevel: 0,
    });
    const activeResult = calculateStressScore({
      hrvDeviation: 40,
      heartRateElevation: 30,
      timeOfDayFactor: 0.5,
      recentActivityLevel: 1.0,
    });
    expect(activeResult.score).toBeLessThan(baseResult.score);
    // Activity carries a 0.15 weight → full activity should shave a meaningful
    // amount (up to 15 pts), not the ~3 pts the old *20 scaling produced.
    expect(baseResult.score - activeResult.score).toBeGreaterThanOrEqual(10);
  });

  it("should clamp score between 0 and 100", () => {
    const lowResult = calculateStressScore({
      hrvDeviation: 0,
      heartRateElevation: 0,
      timeOfDayFactor: 0,
      recentActivityLevel: 1.0,
    });
    expect(lowResult.score).toBeGreaterThanOrEqual(0);

    const highResult = calculateStressScore({
      hrvDeviation: 100,
      heartRateElevation: 100,
      timeOfDayFactor: 1.0,
      recentActivityLevel: 0,
    });
    expect(highResult.score).toBeLessThanOrEqual(100);
  });
});

describe("getTimeOfDayFactor", () => {
  it("should return higher factor during work hours", () => {
    const morning = getTimeOfDayFactor(10);
    const afternoon = getTimeOfDayFactor(15);
    const night = getTimeOfDayFactor(22);
    expect(morning).toBeGreaterThan(night);
    expect(afternoon).toBeGreaterThan(night);
  });

  it("should return low factor during sleep hours", () => {
    expect(getTimeOfDayFactor(3)).toBe(0.2);
    expect(getTimeOfDayFactor(23)).toBe(0.2);
  });

  it("should peak in the afternoon", () => {
    const afternoon = getTimeOfDayFactor(16);
    expect(afternoon).toBe(0.8);
  });
});

describe("getBreathingExercises", () => {
  it("should return all exercises when no level provided", () => {
    const exercises = getBreathingExercises();
    expect(exercises.length).toBe(4);
  });

  it("should return beginner exercises for low stress", () => {
    const exercises = getBreathingExercises("low");
    expect(exercises.every(e => e.level === "beginner")).toBe(true);
  });

  it("should return all exercises for high stress", () => {
    const exercises = getBreathingExercises("high");
    expect(exercises.length).toBe(4);
  });

  it("should have valid exercise structure", () => {
    const exercises = getBreathingExercises();
    for (const ex of exercises) {
      expect(ex.id).toBeDefined();
      expect(ex.name).toBeDefined();
      expect(ex.description).toBeDefined();
      expect(ex.durationSeconds).toBeGreaterThan(0);
      expect(ex.inhale).toBeGreaterThan(0);
      expect(ex.exhale).toBeGreaterThan(0);
      expect(ex.cycles).toBeGreaterThan(0);
    }
  });
});
