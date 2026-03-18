import { pgTable, uuid, text, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";

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
});
