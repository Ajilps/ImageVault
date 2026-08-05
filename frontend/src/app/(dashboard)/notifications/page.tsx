"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { RoleGate } from "@/components/role-gate";
import { PushNotificationManager } from "@/components/push-notification-manager";
import { usePublicConfig } from "@/components/public-config-provider";
import { LoadingCards, Message, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { galleryImageHref } from "@/lib/image-links";
import type { Notification } from "@/lib/types";

export default function NotificationsPage() {
  const { config } = usePublicConfig();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearingNotificationId, setClearingNotificationId] = useState<string | null>(null);

  const loadNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await api.notifications();
      setNotifications(response.notifications);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications(true);
    if (!config) return;
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void loadNotifications(); };
    const interval = window.setInterval(refreshWhenVisible, config.notificationPollIntervalMs);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [config, loadNotifications]);

  async function clearNotification(notificationId: string) {
    setError(null);
    setClearingNotificationId(notificationId);
    try {
      await api.clearNotification(notificationId);
      setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
      window.dispatchEvent(new Event("imagevault:notifications-changed"));
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not clear the notification.");
    } finally {
      setClearingNotificationId(null);
    }
  }

  return (
    <RoleGate>
      <PageHeader eyebrow="Workspace activity" title="Notifications" description="Images that tag you, and organisation-wide uploads, appear here." action={<button type="button" onClick={() => void loadNotifications()} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">Refresh</button>} />
      <div className="mb-6"><PushNotificationManager /></div>
      {error ? <div className="mb-5"><Message>{error}</Message></div> : null}
      {isLoading ? <LoadingCards /> : null}
      {!isLoading && !notifications.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><p className="text-lg font-bold text-slate-800">You&apos;re all caught up</p><p className="mt-2 text-sm text-slate-500">New image uploads and tags will appear here.</p></div> : null}
      {!isLoading && notifications.length ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article key={notification.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <Link href={galleryImageHref(notification.image.id)} className="flex min-w-0 flex-1 gap-4 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-indigo-100">
                <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-xl bg-indigo-50 text-2xl text-indigo-600">▦</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-bold text-slate-800">{notification.message}</span>
                    <span className="whitespace-nowrap text-xs text-slate-400">{new Date(notification.createdAt).toLocaleDateString()}</span>
                  </span>
                  <span className="mt-2 block text-sm text-slate-500">From {notification.sender.name}</span>
                  <span className="mt-2 block text-xs font-bold text-indigo-600">View image in gallery</span>
                </span>
              </Link>
              <button
                type="button"
                disabled={clearingNotificationId === notification.id}
                onClick={() => void clearNotification(notification.id)}
                className="self-end rounded-xl border border-black px-4 py-2.5 text-sm font-bold text-black hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60 sm:self-center"
                aria-label={`Clear notification from ${notification.sender.name}`}
              >
                {clearingNotificationId === notification.id ? "Clearing…" : "Clear"}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </RoleGate>
  );
}
