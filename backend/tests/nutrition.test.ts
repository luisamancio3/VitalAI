import { describe, it, expect, vi } from "vitest";

// Mock transitive dependencies so importing nutrition.routes.js doesn't require env vars
vi.mock("../src/config/database.js", () => ({
  redis: {},
  db: {},
}));

vi.mock("../src/config/claude.js", () => ({
  generateMessage: vi.fn(),
}));

vi.mock("../src/db/schema.js", () => ({
  users: {},
  nutritionProfiles: { userId: "nutrition_profiles.user_id" },
  mealFeedback: {},
}));

vi.mock("../src/middleware/auth.js", () => ({
  authMiddleware: vi.fn(),
}));

vi.mock("../src/services/meal-suggestion.service.js", () => ({
  suggestMeal: vi.fn(),
}));

vi.mock("../src/db/recipes.js", () => ({
  Recipe: { find: vi.fn(), findOne: vi.fn() },
}));

import { profileSchema } from "../src/routes/nutrition.routes.js";

describe("Nutrition Profile Zod Validation", () => {
  it("should accept a valid profile body", () => {
    const validProfile = {
      goal: "gain",
      restrictions: ["vegan", "gluten_free"],
      cookingSkill: "intermediate",
    };

    const result = profileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it("should accept all valid goal values", () => {
    const goals = ["lose", "maintain", "gain"];

    for (const goal of goals) {
      const result = profileSchema.safeParse({
        goal,
        cookingSkill: "beginner",
      });
      expect(result.success).toBe(true);
    }
  });

  it("should accept all valid cookingSkill values", () => {
    const skills = ["beginner", "intermediate", "advanced"];

    for (const cookingSkill of skills) {
      const result = profileSchema.safeParse({
        goal: "maintain",
        cookingSkill,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should default restrictions to empty array when omitted", () => {
    const withoutRestrictions = {
      goal: "lose",
      cookingSkill: "beginner",
    };

    const result = profileSchema.safeParse(withoutRestrictions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.restrictions).toEqual([]);
    }
  });

  it("should reject an invalid goal", () => {
    const invalidGoal = {
      goal: "bulk",
      cookingSkill: "beginner",
    };

    const result = profileSchema.safeParse(invalidGoal);
    expect(result.success).toBe(false);
  });

  it("should reject an invalid cookingSkill", () => {
    const invalidSkill = {
      goal: "gain",
      cookingSkill: "expert",
    };

    const result = profileSchema.safeParse(invalidSkill);
    expect(result.success).toBe(false);
  });

  it("should reject a missing goal", () => {
    const missingGoal = {
      cookingSkill: "beginner",
    };

    const result = profileSchema.safeParse(missingGoal);
    expect(result.success).toBe(false);
  });

  it("should reject a missing cookingSkill", () => {
    const missingSkill = {
      goal: "lose",
    };

    const result = profileSchema.safeParse(missingSkill);
    expect(result.success).toBe(false);
  });

  it("should reject restrictions that is not an array", () => {
    const invalidRestrictions = {
      goal: "maintain",
      restrictions: "vegan",
      cookingSkill: "advanced",
    };

    const result = profileSchema.safeParse(invalidRestrictions);
    expect(result.success).toBe(false);
  });
});
