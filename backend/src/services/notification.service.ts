import { sendPushNotification } from "../config/firebase.js";
import { redis } from "../config/database.js";

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

  // TODO: Query database for FCM token
  return null;
}
