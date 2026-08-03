import webpush from "web-push";

import { env } from "../config/env.js";
import { AppError } from "../errors/appError.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth.service.js";

const pushEnabled = Boolean(env.vapidPublicKey && env.vapidPrivateKey && env.vapidSubject);

if (pushEnabled) {
  webpush.setVapidDetails(env.vapidSubject!, env.vapidPublicKey!, env.vapidPrivateKey!);
}

type SubscriptionInput = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

function requirePushConfiguration() {
  if (!pushEnabled) {
    throw new AppError("Web Push is not configured.", 503, "PUSH_UNAVAILABLE");
  }
}

export async function savePushSubscription(user: AuthenticatedUser, input: SubscriptionInput) {
  requirePushConfiguration();
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: input.endpoint },
    select: { id: true, userId: true },
  });

  if (existing && existing.userId !== user.id) {
    throw new AppError("This push subscription is already linked to another account.", 409, "PUSH_SUBSCRIPTION_IN_USE");
  }

  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: {
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      expirationTime: input.expirationTime ? new Date(input.expirationTime) : null,
    },
    create: {
      userId: user.id,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      expirationTime: input.expirationTime ? new Date(input.expirationTime) : null,
    },
    select: { id: true },
  });

  return { subscription, created: !existing };
}

export async function removePushSubscription(user: AuthenticatedUser, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
}

export async function sendPushNotifications(
  receiverUserIds: string[],
  payload: { title: string; body: string; url: string },
) {
  if (!pushEnabled || receiverUserIds.length === 0) {
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: [...new Set(receiverUserIds)] } },
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime?.getTime() ?? null,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } });
          return;
        }
        console.error("Web Push delivery failed.", { subscriptionId: subscription.id, statusCode });
      }
    }),
  );
}
