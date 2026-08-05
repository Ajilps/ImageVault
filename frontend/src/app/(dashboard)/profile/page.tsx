"use client";

import { FormEvent, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PasswordField } from "@/components/password-field";
import { usePublicConfig } from "@/components/public-config-provider";
import { RoleGate } from "@/components/role-gate";
import { Message, PageHeader, StatCard } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { roleLabel } from "@/lib/roles";

export default function ProfilePage() {
  const { user } = useAuth();
  const { config } = usePublicConfig();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("The new password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.changeOwnPassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Your password has been changed.");
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "The password could not be changed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RoleGate>
      <PageHeader eyebrow="Your account" title="Profile" description="Your account, organisation context, and security settings for ImageVault." />
      <div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
        <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-7 text-white">
          <span className="grid size-16 place-items-center rounded-2xl bg-white/15 text-2xl font-bold">{user?.name.charAt(0).toUpperCase()}</span>
          <h2 className="mt-5 text-2xl font-bold">{user?.name}</h2>
          <p className="mt-1 text-indigo-100">{user?.email}</p>
          <span className="mt-5 inline-block rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">{user ? roleLabel(user.role) : ""}</span>
        </section>
        <section className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Organisation" value={user?.organization?.name ?? "Not assigned"} detail="Current workspace" />
          <StatCard label="Image quota" value={user?.imageQuota ?? 0} detail="Total uploads available" accent="emerald" />
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Account identifier</p>
            <p className="mt-2 break-all font-mono text-sm text-slate-600">{user?.id}</p>
          </article>
        </section>
      </div>

      <form onSubmit={submitPassword} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Change your password</h2>
        <p className="mt-1 text-sm text-slate-500">Confirm your current password before choosing a new one.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <PasswordField required label="Current password" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} />
          <PasswordField required label="New password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} minLength={config?.passwordMinLength} maxLength={config?.passwordMaxLength} />
          <PasswordField required label="Confirm new password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} minLength={config?.passwordMinLength} maxLength={config?.passwordMaxLength} />
        </div>
        {error ? <div className="mt-4"><Message>{error}</Message></div> : null}
        {success ? <div className="mt-4"><Message tone="success">{success}</Message></div> : null}
        <div className="mt-5 flex justify-end">
          <button disabled={isSubmitting || !config} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {isSubmitting ? "Changing password…" : "Change password"}
          </button>
        </div>
      </form>
    </RoleGate>
  );
}
