"use client";
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { usePublicConfig } from "@/components/public-config-provider";
import { PasswordField, TemporaryPasswordNotice } from "@/components/password-field";
import { RoleGate } from "@/components/role-gate";
import { LoadingCards, Message, PageHeader, StatCard } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import type { Organisation } from "@/lib/types";

const initialForm = {
  name: "",
  logoUrl: "",
  address: "",
  phone: "",
  adminName: "",
  adminEmail: "",
};

export default function OrganisationsPage() {
  const { config } = usePublicConfig();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrganisation, setEditingOrganisation] = useState<Organisation | null>(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordOrganisation, setPasswordOrganisation] = useState<Organisation | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState<{ label: string; password: string } | null>(null);

  const loadOrganisations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.organisations();
      setOrganisations(response.organisations);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not load organisations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganisations();
  }, [loadOrganisations]);

  const totals = useMemo(
    () => ({
      users: organisations.reduce((sum, organisation) => sum + organisation._count.users, 0),
      images: organisations.reduce((sum, organisation) => sum + organisation._count.images, 0),
    }),
    [organisations],
  );

  function closeForm() {
    setIsFormOpen(false);
    setEditingOrganisation(null);
    setForm(initialForm);
  }

  function beginCreate() {
    setError(null);
    setCreatedAdmin(null);
    setEditingOrganisation(null);
    setForm(initialForm);
    setIsFormOpen(true);
  }

  function beginEdit(organisation: Organisation) {
    setError(null);
    setEditingOrganisation(organisation);
    setForm({
      ...initialForm,
      name: organisation.name,
      logoUrl: organisation.logoUrl,
      address: organisation.address,
      phone: organisation.phone,
    });
    setIsFormOpen(true);
  }

  async function submitOrganisation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (editingOrganisation) {
        const response = await api.updateOrganisation(editingOrganisation.id, {
          name: form.name,
          logoUrl: form.logoUrl,
          address: form.address,
          phone: form.phone,
        });
        setOrganisations((current) => current.map((organisation) => organisation.id === response.organisation.id ? response.organisation : organisation));
      } else {
        const response = await api.createOrganisation({
          name: form.name,
          ...(form.logoUrl.trim() ? { logoUrl: form.logoUrl.trim() } : {}),
          address: form.address,
          phone: form.phone,
          admin: {
            name: form.adminName,
            email: form.adminEmail,
          },
        });
        setOrganisations((current) => [response.organisation, ...current]);
        setCreatedAdmin({ label: response.organisation.admin.email, password: response.temporaryPassword });
      }
      closeForm();
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not save the organisation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeOrganisation(organisation: Organisation) {
    if (!window.confirm(`Delete ${organisation.name}? This removes its users, images, and payments.`)) return;

    try {
      await api.deleteOrganisation(organisation.id);
      setOrganisations((current) => current.filter((item) => item.id !== organisation.id));
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not delete the organisation.");
    }
  }

  function beginPasswordReset(organisation: Organisation) {
    setPasswordOrganisation(organisation);
    setAdminPassword("");
    setConfirmAdminPassword("");
    setPasswordError(null);
    setPasswordSuccess(null);
  }

  function closePasswordReset() {
    setPasswordOrganisation(null);
    setAdminPassword("");
    setConfirmAdminPassword("");
    setPasswordError(null);
  }

  async function submitAdminPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordOrganisation) return;
    setPasswordError(null);
    setPasswordSuccess(null);
    if (adminPassword !== confirmAdminPassword) {
      setPasswordError("The new password and confirmation do not match.");
      return;
    }

    setIsResettingPassword(true);
    try {
      await api.resetOrganisationAdminPassword(passwordOrganisation.id, adminPassword);
      setPasswordSuccess(`Password changed for ${passwordOrganisation.admin.name}.`);
      setAdminPassword("");
      setConfirmAdminPassword("");
    } catch (caughtError) {
      setPasswordError(caughtError instanceof ApiError ? caughtError.message : "Could not change the Admin password.");
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <RoleGate>
      <PageHeader
        eyebrow="Product Owner"
        title="Organisation workspace"
        description="Create and manage the teams that use ImageVault. Each new organisation receives its first Admin account."
        action={
          <button type="button" onClick={() => isFormOpen ? closeForm() : beginCreate()} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700">
            {isFormOpen ? "Close form" : "Create organisation"}
          </button>
        }
      />

      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        <StatCard label="Organisations" value={organisations.length} detail="Active workspaces" />
        <StatCard label="Members" value={totals.users} detail="Across all organisations" accent="emerald" />
        <StatCard label="Images" value={totals.images} detail="Stored by your teams" accent="amber" />
      </div>

      {createdAdmin ? <TemporaryPasswordNotice accountLabel={createdAdmin.label} password={createdAdmin.password} onDismiss={() => setCreatedAdmin(null)} /> : null}

      {isFormOpen ? (
        <form onSubmit={submitOrganisation} className="mb-8 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-5">
            <h2 className="text-lg font-bold text-slate-900">{editingOrganisation ? `Edit ${editingOrganisation.name}` : "New organisation"}</h2>
            <p className="text-sm text-slate-500">{editingOrganisation ? "Update the organisation details used by its members." : "The Admin account receives a unique generated password that is shown once after creation."}</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Organisation name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <Field label="Logo URL (optional)" type="url" required={false} value={form.logoUrl} onChange={(value) => setForm((current) => ({ ...current, logoUrl: value }))} />
            <Field label="Address" value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} />
            <Field label="Phone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
          </div>
          {!editingOrganisation ? <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-sm font-bold text-slate-800">Initial Admin</p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <Field label="Admin name" value={form.adminName} onChange={(value) => setForm((current) => ({ ...current, adminName: value }))} />
                <Field label="Admin email" type="email" value={form.adminEmail} onChange={(value) => setForm((current) => ({ ...current, adminEmail: value }))} />
              </div>
            </div> : null}
          {error ? <div className="mt-5"><Message>{error}</Message></div> : null}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={closeForm} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{isSubmitting ? "Saving…" : editingOrganisation ? "Save changes" : "Create organisation"}</button>
          </div>
        </form>
      ) : null}

      {passwordOrganisation ? (
        <form onSubmit={submitAdminPassword} className="mb-8 rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Change Admin password</h2>
          <p className="mt-1 text-sm text-slate-500">Set a new password for {passwordOrganisation.admin.name} ({passwordOrganisation.admin.email}).</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <PasswordField required label="New Admin password" autoComplete="new-password" minLength={config?.passwordMinLength} maxLength={config?.passwordMaxLength} value={adminPassword} onChange={setAdminPassword} />
            <PasswordField required label="Confirm Admin password" autoComplete="new-password" minLength={config?.passwordMinLength} maxLength={config?.passwordMaxLength} value={confirmAdminPassword} onChange={setConfirmAdminPassword} />
          </div>
          {passwordError ? <div className="mt-4"><Message>{passwordError}</Message></div> : null}
          {passwordSuccess ? <div className="mt-4"><Message tone="success">{passwordSuccess}</Message></div> : null}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={closePasswordReset} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Close</button>
            <button disabled={isResettingPassword || !config} className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{isResettingPassword ? "Changing…" : "Change password"}</button>
          </div>
        </form>
      ) : null}

      {error && !isFormOpen ? <div className="mb-6"><Message>{error}</Message></div> : null}
      {isLoading ? <LoadingCards /> : null}
      {!isLoading && organisations.length === 0 ? <EmptyOrganisations onCreate={beginCreate} /> : null}
      {!isLoading && organisations.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {organisations.map((organisation) => (
            <article key={organisation.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {organisation.logoUrl ? (
                <img src={organisation.logoUrl} alt="" className="size-14 rounded-2xl border border-slate-100 object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
              ) : (
                <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-2xl border border-black bg-zinc-100 text-lg font-black text-black">
                  {organisation.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="truncate text-base font-bold text-slate-900">{organisation.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{organisation.address}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => beginEdit(organisation)} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Edit</button>
                    <button type="button" onClick={() => beginPasswordReset(organisation)} className="text-xs font-bold text-amber-700 hover:text-amber-800">Admin password</button>
                    <button type="button" onClick={() => void removeOrganisation(organisation)} className="text-xs font-bold text-rose-600 hover:text-rose-700">Delete</button>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                  <p><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Members</span><span className="mt-1 block font-bold text-slate-800">{organisation._count.users}</span></p>
                  <p><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Images</span><span className="mt-1 block font-bold text-slate-800">{organisation._count.images}</span></p>
                  <p><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Admin</span><span className="mt-1 block font-bold text-slate-800">{organisation.admin.name}</span><span className="block truncate text-xs text-slate-500">{organisation.admin.email}</span></p>
                  <p><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Contact</span><span className="mt-1 block font-bold text-slate-800">{organisation.phone}</span><span className="block text-xs text-slate-500">Created {new Date(organisation.createdAt).toLocaleDateString()}</span></p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </RoleGate>
  );
}

function Field({ label, value, onChange, type = "text", minLength, maxLength, required = true }: { label: string; value: string; onChange: (value: string) => void; type?: string; minLength?: number; maxLength?: number; required?: boolean }) {
  return <label className="text-sm font-semibold text-slate-700">{label}<input required={required} type={type} minLength={minLength} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>;
}

function EmptyOrganisations({ onCreate }: { onCreate: () => void }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="text-lg font-bold text-slate-800">Create your first organisation</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Set up an organisation, create its Admin, and start inviting users.</p><button type="button" onClick={onCreate} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Create organisation</button></div>;
}
