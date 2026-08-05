"use client";

import { useEffect, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { PushSubscriptionInput } from "@/lib/types";
import { useAuth } from "./auth-provider";
import { usePublicConfig } from "./public-config-provider";
import { Message } from "./ui";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

function serializeSubscription(subscription: PushSubscription): PushSubscriptionInput {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new ApiError("The browser returned an incomplete push subscription.", 400, "INVALID_PUSH_SUBSCRIPTION");
  }
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

export function PushNotificationManager() {
  const { user } = useAuth();
  const { config } = usePublicConfig();
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const frame = window.requestAnimationFrame(() => setIsSupported(supported));
    if (!supported) return () => window.cancelAnimationFrame(frame);
    let isActive = true;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((current) => { if (isActive) setSubscription(current); })
      .catch(() => { if (isActive) setError("Push notification status could not be loaded."); });
    return () => {
      isActive = false;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  if (!config?.pushEnabled) {
    return <Message tone="info">Push delivery is not configured on this environment. Notifications will continue to refresh while the app is open.</Message>;
  }

  if (!isSupported) {
    return <Message tone="info">This browser does not support Web Push. Notifications will continue to refresh while the app is open.</Message>;
  }

  async function subscribe() {
    if (!user || !config?.vapidPublicKey) return;
    setError(null);
    setIsWorking(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const next = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
      });
      await api.subscribePush(serializeSubscription(next));
      setSubscription(next);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Push permission or subscription failed.");
    } finally {
      setIsWorking(false);
    }
  }

  async function unsubscribe() {
    if (!user || !subscription) return;
    setError(null);
    setIsWorking(true);
    try {
      await api.unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe();
      setSubscription(null);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Push notifications could not be disabled.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="push-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="push-heading" className="font-bold text-slate-900">Background notifications</h2>
          <p className="mt-1 text-sm text-slate-500">{subscription ? "This browser can receive ImageVault alerts." : "Enable alerts after an explicit permission request."}</p>
        </div>
        <button type="button" disabled={isWorking} onClick={() => void (subscription ? unsubscribe() : subscribe())} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {isWorking ? "Updating…" : subscription ? "Disable push" : "Enable push"}
        </button>
      </div>
      {error ? <div className="mt-4"><Message>{error}</Message></div> : null}
    </section>
  );
}
