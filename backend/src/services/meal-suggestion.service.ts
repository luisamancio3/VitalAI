import { eq, and, avg, lte, ne, sql } from "drizzle-orm";
import { db } from "../config/database.js";
import { nutritionProfiles, mealFeedback } from "../db/schema.js";
import { Recipe } from "../db/recipes.js";
import { generateMessage } from "../config/claude.js";

interface MealSuggestion {
  recipe: {
    id: string;
    name: string;
    description?: string;
    macros: { calories: number; protein: number; carbs: number; fat: number };
    prepTime: number;
    difficulty: string;
    ingredients: Array<{ name: string; amount: string }>;
    servings: number;
  };
  message: string;
  context: string;
}

export async function suggestMeal(userId: string, context: string): Promise<MealSuggestion> {
  // 1. Load user's nutrition profile
  const [profile] = await db
    .select()
    .from(nutritionProfiles)
    .where(eq(nutritionProfiles.userId, userId))
    .limit(1);

  // 2. Get disliked recipe IDs (avg rating <= 2)
  const dislikedRecipes = await db
    .select({ recipeId: mealFeedback.recipeId })
    .from(mealFeedback)
    .where(eq(mealFeedback.userId, userId))
    .groupBy(mealFeedback.recipeId)
    .having(sql`avg(${mealFeedback.rating}) <= 2`);

  const dislikedIds = dislikedRecipes.map((r) => r.recipeId);

  // 3. Query recipes from MongoDB
  const filter: Record<string, unknown> = {
    tags: context,
  };

  // Filter by difficulty based on cooking skill
  if (profile?.cookingSkill === "beginner") {
    filter.difficulty = "easy";
  } else if (profile?.cookingSkill === "intermediate") {
    filter.difficulty = { $in: ["easy", "medium"] };
  }
  // Advanced users: no difficulty filter

  // Exclude disliked recipes
  if (dislikedIds.length > 0) {
    filter._id = { $nin: dislikedIds };
  }

  const candidates = await Recipe.find(filter).limit(10).lean();

  if (candidates.length === 0) {
    // Fallback: return any recipe for the context
    const fallback = await Recipe.findOne({ tags: context }).lean();
    if (!fallback) {
      return {
        recipe: {
          id: "default",
          name: "Refeição personalizada",
          macros: { calories: 400, protein: 30, carbs: 50, fat: 15 },
          prepTime: 20,
          difficulty: "easy",
          ingredients: [],
          servings: 1,
        },
        message: "Não encontramos uma receita específica agora. Que tal preparar algo leve e nutritivo?",
        context,
      };
    }
    candidates.push(fallback);
  }

  // 4. Pick a random recipe from top candidates
  const recipe = candidates[Math.floor(Math.random() * candidates.length)];

  // 5. Generate personalized suggestion text
  const systemPrompt = `You are VitalAI, a friendly health coach. Generate a brief, motivating meal suggestion message in Portuguese (BR). Mention the recipe name and one benefit. Keep it under 2 sentences.`;

  const userContext = JSON.stringify({
    recipeName: recipe.name,
    context,
    goal: profile?.goal ?? "maintain",
    macros: recipe.macros,
  });

  let message: string;
  try {
    message = await generateMessage(systemPrompt, userContext);
  } catch {
    message = `Que tal experimentar ${recipe.name}? Uma ótima opção para agora!`;
  }

  return {
    recipe: {
      id: recipe._id?.toString() ?? "unknown",
      name: recipe.name ?? "Receita",
      description: recipe.description,
      macros: recipe.macros ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
      prepTime: recipe.prepTime ?? 20,
      difficulty: recipe.difficulty ?? "easy",
      ingredients: recipe.ingredients ?? [],
      servings: recipe.servings ?? 1,
    },
    message,
    context,
  };
}
