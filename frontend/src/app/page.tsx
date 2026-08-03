"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { homeForRole } from "@/lib/roles";

export default function Home() {
  const router = useRouter();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (isReady && user) {
      router.replace(homeForRole(user.role));
    }
  }, [isReady, router, user]);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 px-6 py-8 text-white">
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,.45),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(20,184,166,.25),transparent_35%)]" />
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white text-lg font-black text-indigo-600">I</span>
          <span className="font-bold tracking-tight">ImageVault</span>
        </div>
        <Link href="/login" className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10">
          Sign in
        </Link>
      </div>
      <section className="mx-auto grid max-w-6xl gap-12 py-24 lg:grid-cols-[1.1fr_.9fr] lg:py-36">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-indigo-300/30 bg-indigo-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-indigo-200">
            Organisation image workspace
          </p>
          <h1 className="max-w-3xl text-5xl font-bold tracking-[-.045em] sm:text-6xl">Keep every team upload secure, organised, and visible.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            ImageVault gives organisations quota-controlled uploads, private shared galleries, tagging, and simple purchase packs.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-indigo-50">
              Sign in to workspace
            </Link>
            <span className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-slate-300">
              Accounts are administrator-managed
            </span>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[.07] p-6 shadow-2xl shadow-indigo-950/40 backdrop-blur">
          <p className="text-sm font-semibold text-indigo-200">One clear workflow</p>
          <div className="mt-6 space-y-4">
            {[
              ["01", "Create your organisation", "Start with an Admin who can invite the team."],
              ["02", "Upload and tag images", "Members receive direct or workspace-wide notifications."],
              ["03", "Add upload packs when needed", "Purchase server-configured upload packs through Razorpay."],
            ].map(([step, title, description]) => (
              <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                <span className="text-sm font-bold text-teal-300">{step}</span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
