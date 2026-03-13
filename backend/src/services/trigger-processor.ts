import { generateMessage } from "../config/claude.js";
import { sendPushNotification } from "../config/firebase.js";
import { redis } from "../config/database.js";

// Trigger types from the watch/phone classified events
export type TriggerType =
  | "post_workout"
  | "morning_sleep"
  | "low_hrv"
  | "high_heart_rate"
  | "meal_detected"
  | "inactivity"
  | "hydration_reminder";

interface ClassifiedEvent {
  userId: string;
  triggerType: TriggerType;
  payload: Record<string, unknown>;
  timestamp: string;
}

// Cooldown periods per trigger type (in seconds)
const COOLDOWN_MAP: Record<TriggerType, number> = {
  post_workout: 3600, // 1 hour
  morning_sleep: 86400, // 24 hours (once per day)
  low_hrv: 7200, // 2 hours
  high_heart_rate: 1800, // 30 minutes
  meal_detected: 3600, // 1 hour
  inactivity: 7200, // 2 hours
  hydration_reminder: 5400, // 90 minutes
};

export async function processEvent(event: ClassifiedEvent): Promise<boolean> {
  const { userId, triggerType } = event;
  const cooldownKey = `cooldown:${userId}:${triggerType}`;

  // Check cooldown via Redis
  const isOnCooldown = await redis.exists(cooldownKey);
  if (isOnCooldown) return false;

  // Set cooldown
  const cooldownSeconds = COOLDOWN_MAP[triggerType];
  await redis.setex(cooldownKey, cooldownSeconds, "1");

  // Generate personalized message via Claude
  const systemPrompt = buildSystemPrompt(triggerType);
  const userContext = JSON.stringify(event.payload);
  const message = await generateMessage(systemPrompt, userContext);

  // Send notification (FCM token lookup would happen here)
  // await sendPushNotification(fcmToken, title, message);

  return true;
}

function buildSystemPrompt(triggerType: TriggerType): string {
  const prompts: Record<TriggerType, string> = {
    morning_sleep:
      "You are VitalAI, a friendly health coach. Generate a brief, encouraging morning message about the user's sleep quality. Keep it under 2 sentences. Use Portuguese (BR).",
    post_workout:
      "You are VitalAI, a friendly health coach. Generate a brief post-workout recovery suggestion. Keep it under 2 sentences. Use Portuguese (BR).",
    low_hrv:
      "You are VitalAI, a friendly health coach. The user's HRV is low. Suggest a calming activity. Keep it under 2 sentences. Use Portuguese (BR).",
    high_heart_rate:
      "You are VitalAI, a friendly health coach. The user's heart rate is elevated at rest. Suggest they take a break. Keep it under 2 sentences. Use Portuguese (BR).",
    meal_detected:
      "You are VitalAI, a friendly health coach. A meal was detected via watch gesture. Ask the user to confirm what they ate. Keep it under 2 sentences. Use Portuguese (BR).",
    inactivity:
      "You are VitalAI, a friendly health coach. The user has been inactive for a while. Gently encourage movement. Keep it under 2 sentences. Use Portuguese (BR).",
    hydration_reminder:
      "You are VitalAI, a friendly health coach. Remind the user to drink water. Keep it under 2 sentences. Use Portuguese (BR).",
  };
  return prompts[triggerType];
}
