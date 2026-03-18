import mongoose from "mongoose";

const recipeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  ingredients: [
    {
      name: { type: String, required: true },
      amount: { type: String, required: true },
    },
  ],
  macros: {
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
  },
  tags: [String], // "post_workout", "breakfast", "lunch", "dinner", "snack"
  prepTime: { type: Number, required: true }, // minutes
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    required: true,
  },
  imageUrl: String,
  servings: { type: Number, default: 1 },
});

export const Recipe = mongoose.model("Recipe", recipeSchema);
