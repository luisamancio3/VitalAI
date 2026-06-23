import { pgTable, uuid, text, boolean, jsonb, timestamp, index, integer, date } from "drizzle-orm/pg-core";

// users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  auth0Id: text("auth0_id").unique().notNull(),
  email: text("email").notNull(),
  name: text("name"),
  fcmToken: text("fcm_token"),
  notificationPreferences: jsonb("notification_preferences").default('{}'),
  healthGoals: jsonb("health_goals").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// health_events table
export const healthEvents = pgTable("health_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  triggerType: text("trigger_type").notNull(),
  payload: jsonb("payload").notNull(),
  messageGenerated: text("message_generated"),
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_health_events_user_id").on(table.userId),
  index("idx_health_events_trigger_type").on(table.triggerType),
  index("idx_health_events_user_created").on(table.userId, table.createdAt),
]);

// notification_log table
export const notificationLog = pgTable("notification_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  eventId: uuid("event_id").references(() => healthEvents.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  fcmMessageId: text("fcm_message_id"),
  delivered: boolean("delivered").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notification_log_user_id").on(table.userId),
  index("idx_notification_log_event_id").on(table.eventId),
  index("idx_notification_log_user_delivered_created").on(table.userId, table.delivered, table.createdAt),
]);

// nutrition_profiles table
export const nutritionProfiles = pgTable("nutrition_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).unique().notNull(),
  goal: text("goal").notNull(), // "lose" | "maintain" | "gain"
  restrictions: jsonb("restrictions").default('[]'), // ["vegan", "gluten_free", ...]
  cookingSkill: text("cooking_skill").notNull(), // "beginner" | "intermediate" | "advanced"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// meal_feedback table
export const mealFeedback = pgTable("meal_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  recipeId: text("recipe_id").notNull(), // MongoDB ObjectId as string
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  context: text("context"), // "post_workout", "breakfast", etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_meal_feedback_user_id").on(table.userId),
  index("idx_meal_feedback_recipe_id").on(table.recipeId),
]);

// weekly_reports table
export const weeklyReports = pgTable("weekly_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  metrics: jsonb("metrics").notNull(), // aggregated data
  reportText: text("report_text").notNull(), // Claude-generated
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_weekly_reports_user_id").on(table.userId),
]);

// monthly_reports table
export const monthlyReports = pgTable("monthly_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  month: date("month").notNull(), // first day of month
  weeksIncluded: integer("weeks_included").notNull(),
  metrics: jsonb("metrics").notNull(),
  reportText: text("report_text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_monthly_reports_user_id").on(table.userId),
  index("idx_monthly_reports_user_month").on(table.userId, table.month),
]);
