"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { api } from "@/lib/api";
import { homeForRole, roleLabel } from "@/lib/roles";
import type { UserRole } from "@/lib/types";
import { InstallPrompt } from "./install-prompt";
import { useAuth } from "./auth-provider";
import { usePublicConfig } from "./public-config-provider";

type NavigationItem = {
  href: string;
  label: string;
  symbol: string;
};

const navigation: Record<UserRole, NavigationItem[]> = {
  PRODUCT_OWNER: [
    { href: "/organisations", label: "Organisations", symbol: "⌘" },
    { href: "/profile", label: "Profile", symbol: "◌" },
  ],
  ADMIN: [
    { href: "/users", label: "Team members", symbol: "♧" },
    { href: "/gallery", label: "Organisation gallery", symbol: "▦" },
    { href: "/notifications", label: "Notifications", symbol: "✦" },
    { href: "/profile", label: "Profile", symbol: "◌" },
  ],
  USER: [
    { href: "/gallery", label: "Gallery", symbol: "▦" },
    { href: "/upload", label: "Upload image", symbol: "↑" },
    { href: "/payments", label: "Upload packs", symbol: "₹" },
    { href: "/notifications", label: "Notifications", symbol: "✦" },
    { href: "/profile", label: "Profile", symbol: "◌" },
  ],
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, isReady, logout } = useAuth();
  const { config } = usePublicConfig();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (isReady && !user) router.replace("/login");
  }, [isReady, router, user]);

  useEffect(() => {
    if (!token || !user || user.role === "PRODUCT_OWNER" || !config) {
      return;
    }

    let isActive = true;
    const refreshNotifications = async () => {
      try {
        const response = await api.notifications(token);
        if (isActive) {
          setNotificationCount(response.notifications.length);
        }
      } catch {
        // The dedicated Notifications page shows request errors. Keep navigation usable.
      }
    };

    void refreshNotifications();
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refreshNotifications(); };
    const interval = window.setInterval(refreshWhenVisible, config.notificationPollIntervalMs);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      isActive = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [config, token, user]);

  if (!isReady || !user) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Loading workspace…</div>;
  }

  const items = navigation[user.role];

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
        <Link href={homeForRole(user.role)} className="mb-9 flex items-center gap-3 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 text-base font-bold text-white shadow-lg shadow-indigo-200">
            I
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight">ImageVault</span>
            <span className="block text-xs text-slate-400">Workspace</span>
          </span>
        </Link>

        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Workspace</p>
        <nav className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <span className="grid size-5 place-items-center text-base">{item.symbol}</span>
                {item.label}
                {item.href === "/notifications" && user.role !== "PRODUCT_OWNER" && notificationCount > 0 ? (
                  <span className="ml-auto min-w-5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <InstallPrompt />

        <div className="mt-auto rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-700">Need a fresh start?</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Your images are private and available only to your organisation.</p>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur lg:px-8">
          <Link href={homeForRole(user.role)} className="flex items-center gap-2 lg:hidden">
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">I</span>
            <span className="text-sm font-bold">ImageVault</span>
          </Link>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-slate-800">{user.organization?.name ?? "ImageVault workspace"}</p>
            <p className="text-xs text-slate-400">{roleLabel(user.role)}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-700">{user.name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <button
              type="button"
              aria-label="Sign out"
              className="grid size-9 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 transition hover:bg-indigo-200"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
