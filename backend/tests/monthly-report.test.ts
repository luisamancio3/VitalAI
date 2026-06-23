import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("Parabéns pelo mês! Seus indicadores melhoraram."),
}));

vi.mock("../src/config/firebase.js", () => ({
  sendPushNotification: vi.fn().mockResolvedValue("mock-message-id"),
}));

function makeResult(items: unknown[] = []) {
  const arr = [...items];
  (arr as any).limit = vi.fn().mockResolvedValue([]);
  return arr;
}

vi.mock("../src/config/database.js", () => {
  const mockDb: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ["select", "from", "insert", "values", "orderBy", "groupBy", "having", "update", "set"];
  for (const m of chainMethods) {
    mockDb[m] = vi.fn().mockReturnValue(mockDb);
  }
  mockDb.where = vi.fn().mockReturnValue(makeResult());
  mockDb.limit = vi.fn().mockResolvedValue([]);
  mockDb.returning = vi.fn().mockResolvedValue([{ id: "monthly-report-uuid" }]);
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue("OK"),
  };
  return { db: mockDb, redis: mockRedis };
});

vi.mock("../src/db/schema.js", () => ({
  weeklyReports: { userId: "weekly_reports.user_id", weekStart: "weekly_reports.week_start" },
  monthlyReports: { userId: "monthly_reports.user_id", month: "monthly_reports.month" },
  users: { id: "users.id" },
  healthEvents: {},
  notificationLog: {},
  mealFeedback: {},
}));

vi.mock("../src/services/notification.service.js", () => ({
  getUserFcmToken: vi.fn().mockResolvedValue(null),
  deliverNotification: vi.fn().mockResolvedValue({ success: true, messageId: "msg-monthly-1" }),
}));

import { generateMonthlyReport, generateMonthlyReportsForAllUsers } from "../src/services/monthly-report.service.js";
import { generateMessage } from "../src/config/claude.js";
import { db } from "../src/config/database.js";
import { getUserFcmToken, deliverNotification } from "../src/services/notification.service.js";

describe("generateMonthlyReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(makeResult());
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "monthly-report-uuid" }]);
  });

  it("should return early message when no weekly reports exist", async () => {
    const result = await generateMonthlyReport("user-empty");

    expect(result).toContain("Nenhum relatório semanal");
    expect(generateMessage).not.toHaveBeenCalled();
  });

  it("should generate report from weekly data", async () => {
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(makeResult([
      { metrics: { avgSleepHours: 7.5, workoutCount: 3, nutrition: { mealsLogged: 5, avgRating: 4 } } },
      { metrics: { avgSleepHours: 7.0, workoutCount: 2, nutrition: { mealsLogged: 4, avgRating: 3.5 } } },
      { metrics: { avgSleepHours: 7.8, workoutCount: 4, nutrition: { mealsLogged: 6, avgRating: 4.5 } } },
      { metrics: { avgSleepHours: 8.0, workoutCount: 3, nutrition: { mealsLogged: 5, avgRating: 4 } } },
    ]));

    const result = await generateMonthlyReport("user-active");

    expect(result).toBe("Parabéns pelo mês! Seus indicadores melhoraram.");
    expect(generateMessage).toHaveBeenCalledOnce();
  });

  it("should pass aggregated metrics to Claude", async () => {
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(makeResult([
      { metrics: { avgSleepHours: 7.0, workoutCount: 2, nutrition: { mealsLogged: 3, avgRating: 4 } } },
      { metrics: { avgSleepHours: 8.0, workoutCount: 4, nutrition: { mealsLogged: 5, avgRating: 5 } } },
    ]));

    await generateMonthlyReport("user-data");

    const metricsArg = (generateMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const metrics = JSON.parse(metricsArg);
    expect(metrics.weeksIncluded).toBe(2);
    expect(metrics.avgSleepHours).toBe(7.5);
    expect(metrics.totalWorkouts).toBe(6);
    expect(metrics.avgWorkoutsPerWeek).toBe(3);
    expect(metrics.totalMealsLogged).toBe(8);
    expect(metrics.avgMealRating).toBe(4.5);
    expect(metrics.sleepTrend).toEqual([7.0, 8.0]);
    expect(metrics.workoutTrend).toEqual([2, 4]);
  });

  it("should detect improving trend when second half is better", async () => {
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(makeResult([
      { metrics: { avgSleepHours: 6.0, workoutCount: 1, nutrition: { mealsLogged: 2, avgRating: 3 } } },
      { metrics: { avgSleepHours: 6.5, workoutCount: 1, nutrition: { mealsLogged: 3, avgRating: 3 } } },
      { metrics: { avgSleepHours: 7.5, workoutCount: 3, nutrition: { mealsLogged: 5, avgRating: 4 } } },
      { metrics: { avgSleepHours: 8.0, workoutCount: 4, nutrition: { mealsLogged: 6, avgRating: 5 } } },
    ]));

    await generateMonthlyReport("user-improving");

    const metricsArg = (generateMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const metrics = JSON.parse(metricsArg);
    expect(metrics.overallTrend).toBe("improving");
  });

  it("should detect declining trend when second half is worse", async () => {
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(makeResult([
      { metrics: { avgSleepHours: 8.0, workoutCount: 4, nutrition: { mealsLogged: 5, avgRating: 5 } } },
      { metrics: { avgSleepHours: 7.5, workoutCount: 3, nutrition: { mealsLogged: 4, avgRating: 4 } } },
      { metrics: { avgSleepHours: 6.5, workoutCount: 1, nutrition: { mealsLogged: 2, avgRating: 3 } } },
      { metrics: { avgSleepHours: 6.0, workoutCount: 1, nutrition: { mealsLogged: 1, avgRating: 2 } } },
    ]));

    await generateMonthlyReport("user-declining");

    const metricsArg = (generateMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const metrics = JSON.parse(metricsArg);
    expect(metrics.overallTrend).toBe("declining");
  });

  it("should use fallback when Claude fails", async () => {
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(makeResult([
      { metrics: { avgSleepHours: 7.5, workoutCount: 3, nutrition: { mealsLogged: 5, avgRating: 4 } } },
      { metrics: { avgSleepHours: 7.0, workoutCount: 2, nutrition: { mealsLogged: 4, avgRating: 3.5 } } },
    ]));
    (generateMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("API down"));

    const result = await generateMonthlyReport("user-fallback");

    expect(result).toContain("Resumo do seu mês");
    expect(result).toContain("2 semanas registradas");
  });

  it("should include sleep and workout info in fallback", async () => {
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(makeResult([
      { metrics: { avgSleepHours: 7.5, workoutCount: 3, nutrition: { mealsLogged: 5, avgRating: 4 } } },
      { metrics: { avgSleepHours: 8.0, workoutCount: 4, nutrition: { mealsLogged: 6, avgRating: 4.5 } } },
    ]));
    (generateMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("fail"));

    const result = await generateMonthlyReport("user-fallback-data");

    expect(result).toContain("7.8 horas");
    expect(result).toContain("7 treinos");
    expect(result).toContain("11 refeições");
  });

  it("should send push notification when user has FCM token", async () => {
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(makeResult([
      { metrics: { avgSleepHours: 7, workoutCount: 2, nutrition: { mealsLogged: 3, avgRating: 4 } } },
    ]));
    (getUserFcmToken as ReturnType<typeof vi.fn>).mockResolvedValue("fcm-token-monthly");

    await generateMonthlyReport("user-with-token");

    expect(deliverNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Relatório Mensal",
        data: expect.objectContaining({ type: "monthly_report" }),
      }),
    );
  });

  it("should store the report in the database", async () => {
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(makeResult([
      { metrics: { avgSleepHours: 7, workoutCount: 2, nutrition: { mealsLogged: 3, avgRating: 4 } } },
    ]));

    await generateMonthlyReport("user-store");

    expect(db.insert).toHaveBeenCalledOnce();
    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-store",
        weeksIncluded: 1,
      }),
    );
  });
});

describe("generateMonthlyReportsForAllUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.where as ReturnType<typeof vi.fn>).mockReturnValue(makeResult([
      { metrics: { avgSleepHours: 7, workoutCount: 2, nutrition: { mealsLogged: 3, avgRating: 4 } } },
    ]));
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "report-uuid" }]);
  });

  it("should generate reports for all users", async () => {
    (db.from as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: "user-1" },
      { id: "user-2" },
    ]);

    const count = await generateMonthlyReportsForAllUsers();

    expect(count).toBe(2);
  });

  it("should continue when one user fails", async () => {
    (db.from as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: "user-ok" },
      { id: "user-fail" },
      { id: "user-ok-2" },
    ]);

    let callCount = 0;
    (db.returning as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 2) throw new Error("DB error");
      return Promise.resolve([{ id: "report-uuid" }]);
    });

    const count = await generateMonthlyReportsForAllUsers();

    expect(count).toBe(2);
  });

  it("should return 0 when no users exist", async () => {
    (db.from as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const count = await generateMonthlyReportsForAllUsers();

    expect(count).toBe(0);
  });
});
