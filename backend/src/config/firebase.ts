import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export const messaging = admin.messaging();

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  return messaging.send({
    token,
    notification: { title, body },
    data,
    apns: {
      payload: {
        aps: { sound: "default", badge: 1 },
      },
    },
  });
}
