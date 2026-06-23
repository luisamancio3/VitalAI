import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import mongoose from "mongoose";
import RedisModule from "ioredis";
const Redis = RedisModule.default ?? RedisModule;
import * as schema from "../db/schema.js";

// PostgreSQL + TimescaleDB (via Drizzle ORM)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

// MongoDB (recipe catalog, food database)
export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required");
  }
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}

// Redis (cache, cooldown tracking, rate limiting)
export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
