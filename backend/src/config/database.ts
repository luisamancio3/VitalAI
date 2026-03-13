import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import mongoose from "mongoose";
import Redis from "ioredis";

// PostgreSQL + TimescaleDB (via Drizzle ORM)
const connectionString = process.env.DATABASE_URL!;
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient);

// MongoDB (recipe catalog, food database)
export async function connectMongo() {
  const uri = process.env.MONGODB_URI!;
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}

// Redis (cache, cooldown tracking, rate limiting)
export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
