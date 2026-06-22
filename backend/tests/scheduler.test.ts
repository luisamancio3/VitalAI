import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/services/report-generator.js", () => ({
  generateReportsForAllUsers: vi.fn().mockResolvedValue(5),
}));

const mockSchedule = vi.fn();
vi.mock("node-cron", () => ({
  default: { schedule: (...args: unknown[]) => mockSchedule(...args) },
}));

import { startScheduler } from "../src/scheduler.js";
import { generateReportsForAllUsers } from "../src/services/report-generator.js";

describe("Scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a cron job on startup", () => {
    startScheduler();

    expect(mockSchedule).toHaveBeenCalledOnce();
  });

  it("should schedule weekly report for Sundays at 3:00 AM", () => {
    startScheduler();

    const [cronExpression, , options] = mockSchedule.mock.calls[0];
    expect(cronExpression).toBe("0 3 * * 0");
    expect(options).toEqual({ timezone: "America/Sao_Paulo" });
  });

  it("should call generateReportsForAllUsers when cron fires", async () => {
    startScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await callback();

    expect(generateReportsForAllUsers).toHaveBeenCalledOnce();
  });

  it("should not throw when report generation fails", async () => {
    (generateReportsForAllUsers as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB down"));

    startScheduler();

    const callback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
    await expect(callback()).resolves.toBeUndefined();
  });
});
