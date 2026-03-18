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

export async function deliverNotification(payload: NotificationPayload) {
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
  // Check Redis cache first
  const cached = await redis.get(`fcm:${userId}`);
  if (cached) return cached;

  // Query database for FCM token
  const [user] = await db
    .select({ fcmToken: users.fcmToken })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const token = user?.fcmToken ?? null;

  // Cache in Redis with 5-minute TTL
  if (token) {
    await redis.setex(`fcm:${userId}`, 300, token);
  }

  return token;
}
