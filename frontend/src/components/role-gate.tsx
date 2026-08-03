"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { canAccessRoute, homeForRole } from "@/lib/roles";
import { useAuth } from "./auth-provider";

export function RoleGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!canAccessRoute(user.role, pathname)) {
      router.replace(homeForRole(user.role));
    }
  }, [isReady, pathname, router, user]);

  if (!isReady || !user || !canAccessRoute(user.role, pathname)) {
    return <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">Loading your workspace…</div>;
  }

  return <>{children}</>;
}
