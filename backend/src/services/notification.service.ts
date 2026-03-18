import { eq } from "drizzle-orm";
import { sendPushNotification } from "../config/firebase.js";
import { redis, db } from "../config/database.js";
import { users } from "../db/schema.js";

interface NotificationPayload {
  userId: string;
  fcmToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

type DeliveryResult =
  | { success: true; messageId: string }
  | { success: false; error: unknown };

export async function deliverNotification(payload: NotificationPayload): Promise<DeliveryResult> {
  const { fcmToken, title, body, data } = payload;

  try {
    const messageId = await sendPushNotification(fcmToken, title, body, data);
    return { success: true, messageId };
  } catch (error) {
    console.error("FCM delivery failed:", error);
    return { success: false, error };
  }
}

export async function getUserFcmToken(userId: string): Promise<string | null> {
  // Check Redis cache first (best-effort)
  try {
    const cached = await redis.get(`fcm:${userId}`);
    if (cached) return cached;
  } catch {
    // Redis unavailable — fall through to database
  }

  // Query database for FCM token
  const [user] = await db
    .select({ fcmToken: users.fcmToken })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const token = user?.fcmToken ?? null;

  // Cache in Redis with 5-minute TTL (best-effort)
  if (token) {
    try {
      await redis.setex(`fcm:${userId}`, 300, token);
    } catch {
      // Redis unavailable — skip caching
    }
  }

  return token;
}
