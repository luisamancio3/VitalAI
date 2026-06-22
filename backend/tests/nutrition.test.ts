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

import {
  profileSchema,
  profilePatchSchema,
  feedbackSchema,
  suggestionQuerySchema,
} from "../src/routes/nutrition.routes.js";

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

describe("Nutrition Profile Patch Zod Validation", () => {
  it("should accept a partial update with only goal", () => {
    const result = profilePatchSchema.safeParse({ goal: "lose" });
    expect(result.success).toBe(true);
  });

  it("should accept a partial update with only cookingSkill", () => {
    const result = profilePatchSchema.safeParse({ cookingSkill: "advanced" });
    expect(result.success).toBe(true);
  });

  it("should accept a partial update with only restrictions", () => {
    const result = profilePatchSchema.safeParse({ restrictions: ["vegan"] });
    expect(result.success).toBe(true);
  });

  it("should accept an empty body", () => {
    const result = profilePatchSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should reject an invalid goal", () => {
    const result = profilePatchSchema.safeParse({ goal: "shred" });
    expect(result.success).toBe(false);
  });

  it("should reject an invalid cookingSkill", () => {
    const result = profilePatchSchema.safeParse({ cookingSkill: "master" });
    expect(result.success).toBe(false);
  });
});

describe("Meal Feedback Zod Validation", () => {
  it("should accept a valid feedback body", () => {
    const validFeedback = {
      recipeId: "abc123",
      rating: 4,
      comment: "Muito bom!",
      context: "post_workout",
    };

    const result = feedbackSchema.safeParse(validFeedback);
    expect(result.success).toBe(true);
  });

  it("should accept feedback without optional fields", () => {
    const minimalFeedback = {
      recipeId: "abc123",
      rating: 3,
    };

    const result = feedbackSchema.safeParse(minimalFeedback);
    expect(result.success).toBe(true);
  });

  it("should accept rating at boundaries (1 and 5)", () => {
    expect(feedbackSchema.safeParse({ recipeId: "a", rating: 1 }).success).toBe(true);
    expect(feedbackSchema.safeParse({ recipeId: "a", rating: 5 }).success).toBe(true);
  });

  it("should reject rating below 1", () => {
    const result = feedbackSchema.safeParse({ recipeId: "a", rating: 0 });
    expect(result.success).toBe(false);
  });

  it("should reject rating above 5", () => {
    const result = feedbackSchema.safeParse({ recipeId: "a", rating: 6 });
    expect(result.success).toBe(false);
  });

  it("should reject non-integer rating", () => {
    const result = feedbackSchema.safeParse({ recipeId: "a", rating: 3.5 });
    expect(result.success).toBe(false);
  });

  it("should reject empty recipeId", () => {
    const result = feedbackSchema.safeParse({ recipeId: "", rating: 4 });
    expect(result.success).toBe(false);
  });

  it("should reject comment over 200 characters", () => {
    const longComment = "a".repeat(201);
    const result = feedbackSchema.safeParse({ recipeId: "a", rating: 4, comment: longComment });
    expect(result.success).toBe(false);
  });

  it("should accept comment at exactly 200 characters", () => {
    const maxComment = "a".repeat(200);
    const result = feedbackSchema.safeParse({ recipeId: "a", rating: 4, comment: maxComment });
    expect(result.success).toBe(true);
  });

  it("should reject a missing recipeId", () => {
    const result = feedbackSchema.safeParse({ rating: 4 });
    expect(result.success).toBe(false);
  });

  it("should reject a missing rating", () => {
    const result = feedbackSchema.safeParse({ recipeId: "a" });
    expect(result.success).toBe(false);
  });
});

describe("Suggestion Query Zod Validation", () => {
  it("should accept all valid context values", () => {
    const contexts = ["post_workout", "breakfast", "lunch", "dinner", "snack"];

    for (const context of contexts) {
      const result = suggestionQuerySchema.safeParse({ context });
      expect(result.success).toBe(true);
    }
  });

  it("should accept empty query (context is optional)", () => {
    const result = suggestionQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should reject an invalid context", () => {
    const result = suggestionQuerySchema.safeParse({ context: "midnight_snack" });
    expect(result.success).toBe(false);
  });
});
