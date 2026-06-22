import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/services/report-generator.js", () => ({
  generateReportsForAllUsers: vi.fn().mockResolvedValue(5),
}));

vi.mock("../src/services/meal-routine.service.js", () => ({
  checkMealRoutines: vi.fn().mockResolvedValue(3),
}));

const mockSchedule = vi.fn();
vi.mock("node-cron", () => ({
  default: { schedule: (...args: unknown[]) => mockSchedule(...args) },
}));

import { startScheduler } from "../src/scheduler.js";
import { generateReportsForAllUsers } from "../src/services/report-generator.js";
import { checkMealRoutines } from "../src/services/meal-routine.service.js";

describe("Scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register two cron jobs on startup", () => {
    startScheduler();

    expect(mockSchedule).toHaveBeenCalledTimes(2);
  });

  it("should schedule weekly report for Sundays at 3:00 AM", () => {
    startScheduler();

    const [cronExpression, , options] = mockSchedule.mock.calls[0];
    expect(cronExpression).toBe("0 3 * * 0");
    expect(options).toEqual({ timezone: "America/Sao_Paulo" });
  });

  it("should schedule meal routine check every 30 min from 6-22h", () => {
    startScheduler();

    const [cronExpression, , options] = mockSchedule.mock.calls[1];
    expect(cronExpression).toBe("0,30 6-22 * * *");
    expect(options).toEqual({ timezone: "America/Sao_Paulo" });
  });

  it("should call generateReportsForAllUsers when weekly cron fires", async () => {
    startScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(generateReportsForAllUsers).toHaveBeenCalledOnce();
  });

  it("should call checkMealRoutines when meal cron fires", async () => {
    startScheduler();

    const callback = mockSchedule.mock.calls[1][1] as () => Promise<void>;
    await callback();

    expect(checkMealRoutines).toHaveBeenCalledOnce();
  });

  it("should not throw when report generation fails", async () => {
    (generateReportsForAllUsers as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB down"));

    startScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await expect(callback()).resolves.toBeUndefined();
  });

  it("should not throw when meal routine check fails", async () => {
    (checkMealRoutines as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Redis down"));

    startScheduler();

    const callback = mockSchedule.mock.calls[1][1] as () => Promise<void>;
    await expect(callback()).resolves.toBeUndefined();
  });
});
