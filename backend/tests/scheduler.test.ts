import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/services/report-generator.js", () => ({
  generateReportsForAllUsers: vi.fn().mockResolvedValue(5),
}));

vi.mock("../src/services/meal-routine.service.js", () => ({
  checkMealRoutines: vi.fn().mockResolvedValue(3),
}));

vi.mock("../src/services/monthly-report.service.js", () => ({
  generateMonthlyReportsForAllUsers: vi.fn().mockResolvedValue(4),
}));

const mockSchedule = vi.fn();
vi.mock("node-cron", () => ({
  default: { schedule: (...args: unknown[]) => mockSchedule(...args) },
}));

import { startScheduler } from "../src/scheduler.js";
import { generateReportsForAllUsers } from "../src/services/report-generator.js";
import { checkMealRoutines } from "../src/services/meal-routine.service.js";
import { generateMonthlyReportsForAllUsers } from "../src/services/monthly-report.service.js";

describe("Scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register three cron jobs on startup", () => {
    startScheduler();

    expect(mockSchedule).toHaveBeenCalledTimes(3);
  });

  it("should schedule weekly report for Sundays at 3:00 AM", () => {
    startScheduler();

    const [cronExpression, , options] = mockSchedule.mock.calls[0];
    expect(cronExpression).toBe("0 3 * * 0");
    expect(options).toEqual({ timezone: "America/Sao_Paulo" });
  });

  it("should schedule monthly report for 1st of month at 4:00 AM", () => {
    startScheduler();

    const [cronExpression, , options] = mockSchedule.mock.calls[1];
    expect(cronExpression).toBe("0 4 1 * *");
    expect(options).toEqual({ timezone: "America/Sao_Paulo" });
  });

  it("should schedule meal routine check every 30 min from 6-22h", () => {
    startScheduler();

    const [cronExpression, , options] = mockSchedule.mock.calls[2];
    expect(cronExpression).toBe("0,30 6-22 * * *");
    expect(options).toEqual({ timezone: "America/Sao_Paulo" });
  });

  it("should call generateReportsForAllUsers when weekly cron fires", async () => {
    startScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(generateReportsForAllUsers).toHaveBeenCalledOnce();
  });

  it("should call generateMonthlyReportsForAllUsers when monthly cron fires", async () => {
    startScheduler();

    const callback = mockSchedule.mock.calls[1][1] as () => Promise<void>;
    await callback();

    expect(generateMonthlyReportsForAllUsers).toHaveBeenCalledOnce();
  });

  it("should call checkMealRoutines when meal cron fires", async () => {
    startScheduler();

    const callback = mockSchedule.mock.calls[2][1] as () => Promise<void>;
    await callback();

    expect(checkMealRoutines).toHaveBeenCalledOnce();
  });

  it("should not throw when report generation fails", async () => {
    (generateReportsForAllUsers as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB down"));

    startScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await expect(callback()).resolves.toBeUndefined();
  });

  it("should not throw when monthly report generation fails", async () => {
    (generateMonthlyReportsForAllUsers as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB down"));

    startScheduler();

    const callback = mockSchedule.mock.calls[1][1] as () => Promise<void>;
    await expect(callback()).resolves.toBeUndefined();
  });

  it("should not throw when meal routine check fails", async () => {
    (checkMealRoutines as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Redis down"));

    startScheduler();

    const callback = mockSchedule.mock.calls[2][1] as () => Promise<void>;
    await expect(callback()).resolves.toBeUndefined();
  });
});
