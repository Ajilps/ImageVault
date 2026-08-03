"use client";
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { RoleGate } from "@/components/role-gate";
import { PushNotificationManager } from "@/components/push-notification-manager";
import { usePublicConfig } from "@/components/public-config-provider";
import { LoadingCards, Message, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import type { Notification } from "@/lib/types";

export default function NotificationsPage() {
  const { token } = useAuth();
  const { config } = usePublicConfig();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async (showLoading = false) => {
    if (!token) return;
    if (showLoading) setIsLoading(true);
    try {
      const response = await api.notifications(token);
      setNotifications(response.notifications);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

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

  return (
    <RoleGate>
      <PageHeader eyebrow="Workspace activity" title="Notifications" description="Images that tag you, and organisation-wide uploads, appear here." action={<button type="button" onClick={() => void loadNotifications()} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">Refresh</button>} />
      <div className="mb-6"><PushNotificationManager /></div>
      {error ? <div className="mb-5"><Message>{error}</Message></div> : null}
      {isLoading ? <LoadingCards /> : null}
      {!isLoading && !notifications.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><p className="text-lg font-bold text-slate-800">You&apos;re all caught up</p><p className="mt-2 text-sm text-slate-500">New image uploads and tags will appear here.</p></div> : null}
      {!isLoading && notifications.length ? <div className="space-y-3">{notifications.map((notification) => <article key={notification.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><a href={notification.image.downloadUrl} target="_blank" rel="noreferrer" className="size-16 shrink-0 overflow-hidden rounded-xl bg-slate-100"><img src={notification.image.downloadUrl} alt="Related upload" className="size-full object-cover" /></a><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold text-slate-800">{notification.message}</p><span className="whitespace-nowrap text-xs text-slate-400">{new Date(notification.createdAt).toLocaleDateString()}</span></div><p className="mt-2 text-sm text-slate-500">From {notification.sender.name}</p></div></article>)}</div> : null}
    </RoleGate>
  );
}
