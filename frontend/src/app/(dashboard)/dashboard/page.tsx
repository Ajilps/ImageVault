"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { homeForRole } from "@/lib/roles";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    router.replace(user ? homeForRole(user.role) : "/login");
  }, [isReady, router, user]);

  return <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">Opening your workspace…</div>;
}
