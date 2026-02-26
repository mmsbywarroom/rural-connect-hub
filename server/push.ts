import webpush from "web-push";
import { storage } from "./storage";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@patialarural.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export async function sendPushToAll(title: string, body: string, url?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys not configured, skipping push notifications");
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await storage.getAllPushSubscriptions();
  let sent = 0;
  let failed = 0;

  const payload = JSON.stringify({
    title,
    body,
    url: url || "/app",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      sent++;
    } catch (error: any) {
      failed++;
      if (error.statusCode === 404 || error.statusCode === 410) {
        await storage.deletePushSubscription(sub.endpoint);
      }
    }
  }

  return { sent, failed, total: subscriptions.length };
}

export async function sendPushToUser(appUserId: string, title: string, body: string, url?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await storage.getPushSubscriptionsByUser(appUserId);
  let sent = 0;
  let failed = 0;

  const payload = JSON.stringify({
    title,
    body,
    url: url || "/app",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      sent++;
    } catch (error: any) {
      failed++;
      if (error.statusCode === 404 || error.statusCode === 410) {
        await storage.deletePushSubscription(sub.endpoint);
      }
    }
  }

  return { sent, failed };
}

export { VAPID_PUBLIC_KEY };
