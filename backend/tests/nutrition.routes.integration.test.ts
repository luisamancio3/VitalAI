import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

// Mock jose to bypass JWT verification
vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn().mockReturnValue("mock-jwks"),
  jwtVerify: vi.fn().mockResolvedValue({
    payload: { sub: "auth0|test-user-123" },
    protectedHeader: { alg: "RS256" },
  }),
}));

// Mock database
vi.mock("../src/config/database.js", () => {
  const mockDb: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = ["select", "from", "where", "insert", "values", "update", "set", "orderBy", "groupBy", "having", "onConflictDoUpdate"];
  for (const m of chainMethods) {
    mockDb[m] = vi.fn().mockReturnValue(mockDb);
  }
  mockDb.limit = vi.fn().mockResolvedValue([]);
  mockDb.returning = vi.fn().mockResolvedValue([]);
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    setex: vi.fn().mockResolvedValue("OK"),
  };
  return { db: mockDb, redis: mockRedis };
});

vi.mock("../src/db/schema.js", () => ({
  users: { id: "users.id", auth0Id: "users.auth0_id", fcmToken: "users.fcm_token" },
  nutritionProfiles: { userId: "nutrition_profiles.user_id" },
  mealFeedback: { userId: "meal_feedback.user_id", createdAt: "meal_feedback.created_at" },
  healthEvents: { id: "health_events.id" },
  weeklyReports: { id: "weekly_reports.id", userId: "weekly_reports.user_id" },
  notificationLog: {},
  stressScores: { id: "stress_scores.id", userId: "stress_scores.user_id", createdAt: "stress_scores.created_at" },
}));

vi.mock("../src/services/meal-suggestion.service.js", () => ({
  suggestMeal: vi.fn().mockResolvedValue({
    recipe: { name: "Frango grelhado", calories: 350 },
    message: "Ótima escolha pós-treino!",
  }),
}));

vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("mock report"),
}));

vi.mock("../src/config/firebase.js", () => ({
  sendPushNotification: vi.fn().mockResolvedValue("mock-id"),
}));

vi.mock("../src/services/notification.service.js", () => ({
  getUserFcmToken: vi.fn().mockResolvedValue(null),
  deliverNotification: vi.fn().mockResolvedValue({ success: true, messageId: "msg-1" }),
}));

import { db } from "../src/config/database.js";
import { suggestMeal } from "../src/services/meal-suggestion.service.js";

let app: FastifyInstance;

beforeAll(async () => {
  const { buildApp } = await import("../src/app.js");
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

const AUTH_HEADER = "Bearer valid-test-token";

describe("POST /api/v1/nutrition/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user lookup returns a user
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "uuid-user-123" }]);
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "profile-uuid-1",
      userId: "uuid-user-123",
      goal: "maintain",
      restrictions: [],
      cookingSkill: "intermediate",
    }]);
  });

  it("should create a nutrition profile with valid data", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
      payload: {
        goal: "maintain",
        restrictions: ["gluten_free"],
        cookingSkill: "intermediate",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty("id");
    expect(body.goal).toBe("maintain");
  });

  it("should return 400 for invalid goal", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
      payload: {
        goal: "bulk",
        restrictions: [],
        cookingSkill: "beginner",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty("error");
  });

  it("should return 400 for missing cookingSkill", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
      payload: {
        goal: "lose",
        restrictions: [],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 without authorization header", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/profile",
      payload: {
        goal: "gain",
        restrictions: [],
        cookingSkill: "advanced",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 404 when user not found in database", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
      payload: {
        goal: "maintain",
        restrictions: [],
        cookingSkill: "beginner",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe("User not found");
  });

  it("should accept empty restrictions array", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
      payload: {
        goal: "gain",
        restrictions: [],
        cookingSkill: "advanced",
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it("should return 500 when database insert fails", async () => {
    (db.returning as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB connection lost"));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
      payload: {
        goal: "lose",
        restrictions: ["vegan"],
        cookingSkill: "beginner",
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("Internal server error");
  });
});

describe("GET /api/v1/nutrition/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the user nutrition profile", async () => {
    let limitCallCount = 0;
    (db.limit as ReturnType<typeof vi.fn>).mockImplementation(() => {
      limitCallCount++;
      if (limitCallCount === 1) {
        return Promise.resolve([{ id: "uuid-user-123" }]);
      }
      return Promise.resolve([{
        id: "profile-uuid-1",
        userId: "uuid-user-123",
        goal: "lose",
        restrictions: ["lactose_free"],
        cookingSkill: "beginner",
      }]);
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.goal).toBe("lose");
    expect(body.restrictions).toContain("lactose_free");
  });

  it("should return 404 when no profile exists", async () => {
    let limitCallCount = 0;
    (db.limit as ReturnType<typeof vi.fn>).mockImplementation(() => {
      limitCallCount++;
      if (limitCallCount === 1) {
        return Promise.resolve([{ id: "uuid-user-123" }]);
      }
      return Promise.resolve([]);
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe("No nutrition profile found");
  });

  it("should return 404 when user not found", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 without auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nutrition/profile",
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("PATCH /api/v1/nutrition/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "uuid-user-123" }]);
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "profile-uuid-1",
      userId: "uuid-user-123",
      goal: "gain",
      restrictions: ["vegan"],
      cookingSkill: "advanced",
    }]);
  });

  it("should update goal only", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
      payload: { goal: "gain" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().goal).toBe("gain");
  });

  it("should update cookingSkill only", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
      payload: { cookingSkill: "advanced" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("should return 400 for invalid goal value", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
      payload: { goal: "shred" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 404 when profile does not exist", async () => {
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
      payload: { goal: "maintain" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 500 when database update fails", async () => {
    (db.returning as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("constraint violation"));

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/nutrition/profile",
      headers: { authorization: AUTH_HEADER },
      payload: { goal: "lose" },
    });

    expect(response.statusCode).toBe(500);
  });
});

describe("GET /api/v1/nutrition/suggestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "uuid-user-123" }]);
  });

  it("should return a meal suggestion", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nutrition/suggestion",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty("recipe");
    expect(body).toHaveProperty("message");
  });

  it("should pass context query param to suggestMeal", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nutrition/suggestion?context=post_workout",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    expect(suggestMeal).toHaveBeenCalledWith("uuid-user-123", "post_workout");
  });

  it("should default to lunch context when none provided", async () => {
    await app.inject({
      method: "GET",
      url: "/api/v1/nutrition/suggestion",
      headers: { authorization: AUTH_HEADER },
    });

    expect(suggestMeal).toHaveBeenCalledWith("uuid-user-123", "lunch");
  });

  it("should return 400 for invalid context value", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nutrition/suggestion?context=midnight_snack",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 500 when suggestMeal throws", async () => {
    (suggestMeal as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Claude API failed"));

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nutrition/suggestion",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("Internal server error");
  });
});

describe("POST /api/v1/nutrition/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "uuid-user-123" }]);
    (db.returning as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "feedback-uuid-1",
      userId: "uuid-user-123",
      recipeId: "recipe-abc",
      rating: 4,
      comment: "Muito bom!",
      context: "lunch",
    }]);
  });

  it("should create feedback with valid data", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/feedback",
      headers: { authorization: AUTH_HEADER },
      payload: {
        recipeId: "recipe-abc",
        rating: 4,
        comment: "Muito bom!",
        context: "lunch",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().recipeId).toBe("recipe-abc");
    expect(response.json().rating).toBe(4);
  });

  it("should create feedback without optional fields", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/feedback",
      headers: { authorization: AUTH_HEADER },
      payload: {
        recipeId: "recipe-xyz",
        rating: 5,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it("should return 400 for rating below 1", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/feedback",
      headers: { authorization: AUTH_HEADER },
      payload: {
        recipeId: "recipe-abc",
        rating: 0,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for rating above 5", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/feedback",
      headers: { authorization: AUTH_HEADER },
      payload: {
        recipeId: "recipe-abc",
        rating: 6,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for missing recipeId", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/feedback",
      headers: { authorization: AUTH_HEADER },
      payload: {
        rating: 3,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 for comment exceeding 200 chars", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/feedback",
      headers: { authorization: AUTH_HEADER },
      payload: {
        recipeId: "recipe-abc",
        rating: 3,
        comment: "a".repeat(201),
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 500 when database insert fails", async () => {
    (db.returning as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/nutrition/feedback",
      headers: { authorization: AUTH_HEADER },
      payload: {
        recipeId: "recipe-abc",
        rating: 4,
      },
    });

    expect(response.statusCode).toBe(500);
  });
});

describe("GET /api/v1/nutrition/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "uuid-user-123" }]);
  });

  it("should return meal feedback history", async () => {
    // First limit() = user lookup, second limit() = history query
    let limitCallCount = 0;
    (db.limit as ReturnType<typeof vi.fn>).mockImplementation((n?: number) => {
      limitCallCount++;
      if (limitCallCount === 1) {
        return Promise.resolve([{ id: "uuid-user-123" }]);
      }
      return Promise.resolve([
        { id: "fb-1", recipeId: "r1", rating: 5, context: "lunch" },
        { id: "fb-2", recipeId: "r2", rating: 3, context: "dinner" },
      ]);
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nutrition/history",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveLength(2);
    expect(body[0].recipeId).toBe("r1");
  });

  it("should return empty array when no feedback exists", async () => {
    let limitCallCount = 0;
    (db.limit as ReturnType<typeof vi.fn>).mockImplementation(() => {
      limitCallCount++;
      if (limitCallCount === 1) {
        return Promise.resolve([{ id: "uuid-user-123" }]);
      }
      return Promise.resolve([]);
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nutrition/history",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("should return 404 when user not found", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nutrition/history",
      headers: { authorization: AUTH_HEADER },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 without auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/nutrition/history",
    });

    expect(response.statusCode).toBe(401);
  });
});
