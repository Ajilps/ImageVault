"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Message } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { homeForRole } from "@/lib/roles";
import { usePublicConfig } from "@/components/public-config-provider";

export default function LoginPage() {
  const router = useRouter();
  const { user, isReady, login } = useAuth();
  const { config } = usePublicConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isReady && user) {
      router.replace(homeForRole(user.role));
    }
  }, [isReady, router, user]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login({ email, password });
      router.replace(homeForRole(user.role));
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 lg:hidden">
        <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white">I</span>
        ImageVault
      </Link>
      <p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-600">Welcome back</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Sign in to your workspace</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">Use the account created for your ImageVault organisation.</p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        {error ? <Message>{error}</Message> : null}
        <label className="block text-sm font-semibold text-slate-700">
          Email address
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Password
          <input
            required
            minLength={config?.passwordMinLength}
            maxLength={config?.passwordMaxLength}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm leading-6 text-slate-500">
        Accounts are created by a Product Owner or organisation Admin. Contact your administrator if you need access.
      </p>
    </div>
  );
}
