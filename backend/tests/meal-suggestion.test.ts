import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn().mockResolvedValue("Que tal experimentar Frango Grelhado? Rico em proteína!"),
}));

vi.mock("../src/config/database.js", () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockResolvedValue([]),
  };
  return { db: mockDb };
});

vi.mock("../src/db/schema.js", () => ({
  nutritionProfiles: { userId: "nutrition_profiles.user_id" },
  mealFeedback: { userId: "meal_feedback.user_id", recipeId: "meal_feedback.recipe_id", rating: "meal_feedback.rating" },
}));

const mockFind = vi.fn();
const mockFindOne = vi.fn();

vi.mock("../src/db/recipes.js", () => ({
  Recipe: {
    find: (...args: unknown[]) => {
      mockFind(...args);
      return {
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          {
            _id: "recipe-001",
            name: "Frango Grelhado",
            description: "Peito de frango grelhado com legumes",
            macros: { calories: 350, protein: 40, carbs: 20, fat: 8 },
            prepTime: 25,
            difficulty: "easy",
            ingredients: [{ name: "Frango", amount: "200g" }],
            servings: 1,
            tags: ["lunch", "post_workout"],
          },
        ]),
      };
    },
    findOne: (...args: unknown[]) => {
      mockFindOne(...args);
      return {
        lean: vi.fn().mockResolvedValue(null),
      };
    },
  },
}));

import { suggestMeal } from "../src/services/meal-suggestion.service.js";
import { db } from "../src/config/database.js";
import { generateMessage } from "../src/config/claude.js";

describe("suggestMeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: user has a profile, no disliked recipes
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([
      { goal: "gain", restrictions: [], cookingSkill: "beginner" },
    ]);
    (db.having as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("should return a meal suggestion with recipe and message", async () => {
    const result = await suggestMeal("user-123", "lunch");

    expect(result.recipe).toBeDefined();
    expect(result.recipe.name).toBe("Frango Grelhado");
    expect(result.recipe.macros.protein).toBe(40);
    expect(result.message).toBe("Que tal experimentar Frango Grelhado? Rico em proteína!");
    expect(result.context).toBe("lunch");
  });

  it("should pass context as tag filter to Recipe.find", async () => {
    await suggestMeal("user-123", "post_workout");

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({ tags: "post_workout" }),
    );
  });

  it("should filter difficulty to easy for beginner users", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([
      { goal: "lose", restrictions: [], cookingSkill: "beginner" },
    ]);

    await suggestMeal("user-123", "dinner");

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({ difficulty: "easy" }),
    );
  });

  it("should filter difficulty to easy/medium for intermediate users", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([
      { goal: "maintain", restrictions: [], cookingSkill: "intermediate" },
    ]);

    await suggestMeal("user-123", "lunch");

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({ difficulty: { $in: ["easy", "medium"] } }),
    );
  });

  it("should not filter difficulty for advanced users", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([
      { goal: "gain", restrictions: [], cookingSkill: "advanced" },
    ]);

    await suggestMeal("user-123", "lunch");

    expect(mockFind).toHaveBeenCalledWith(
      expect.not.objectContaining({ difficulty: expect.anything() }),
    );
  });

  it("should exclude disliked recipes (avg rating <= 2)", async () => {
    (db.having as ReturnType<typeof vi.fn>).mockResolvedValue([
      { recipeId: "bad-recipe-1" },
      { recipeId: "bad-recipe-2" },
    ]);

    await suggestMeal("user-123", "breakfast");

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $nin: ["bad-recipe-1", "bad-recipe-2"] },
      }),
    );
  });

  it("should use fallback message when Claude fails", async () => {
    (generateMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("API timeout"));

    const result = await suggestMeal("user-123", "snack");

    expect(result.message).toContain("Frango Grelhado");
    expect(result.message).toContain("Que tal experimentar");
  });

  it("should pass goal and macros to Claude as context", async () => {
    (db.limit as ReturnType<typeof vi.fn>).mockResolvedValue([
      { goal: "lose", restrictions: [], cookingSkill: "beginner" },
    ]);

    await suggestMeal("user-123", "lunch");

    expect(generateMessage).toHaveBeenCalledWith(
      expect.stringContaining("VitalAI"),
      expect.stringContaining('"goal":"lose"'),
    );
  });
});
