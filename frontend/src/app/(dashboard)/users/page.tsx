"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { usePublicConfig } from "@/components/public-config-provider";
import { RoleGate } from "@/components/role-gate";
import { LoadingCards, Message, PageHeader, StatCard } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import type { ManagedUser } from "@/lib/types";

export default function UsersPage() {
  const { token } = useAuth();
  const { config } = usePublicConfig();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allocationUser, setAllocationUser] = useState<ManagedUser | null>(null);
  const [additionalSlots, setAdditionalSlots] = useState("");
  const [allocationError, setAllocationError] = useState<string | null>(null);
  const [allocationSuccess, setAllocationSuccess] = useState<string | null>(null);
  const [isAllocating, setIsAllocating] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await api.users(token);
      setUsers(response.users);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not load your team.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  function closeForm() {
    setIsFormOpen(false);
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("");
  }

  function beginCreate() {
    setError(null);
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setIsFormOpen(true);
  }

  function beginEdit(user: ManagedUser) {
    setError(null);
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setIsFormOpen(true);
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      if (editingUser) {
        const response = await api.updateUser(token, editingUser.id, {
          name,
          email,
          ...(password ? { password } : {}),
        });
        setUsers((current) => current.map((user) => user.id === response.user.id ? response.user : user));
      } else {
        const response = await api.createUser(token, { name, email });
        setUsers((current) => [...current, response.user]);
      }
      closeForm();
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not save the user.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeUser(user: ManagedUser) {
    if (!token || !window.confirm(`Remove ${user.name} and their uploaded images?`)) return;
    try {
      await api.deleteUser(token, user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not remove the user.");
    }
  }

  function beginSlotAllocation(user: ManagedUser) {
    setAllocationUser(user);
    setAdditionalSlots("");
    setAllocationError(null);
    setAllocationSuccess(null);
  }

  function closeSlotAllocation() {
    setAllocationUser(null);
    setAdditionalSlots("");
    setAllocationError(null);
  }

  async function submitSlotAllocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !allocationUser) return;
    setAllocationError(null);
    setAllocationSuccess(null);
    setIsAllocating(true);
    try {
      const response = await api.allocateUserSlots(token, allocationUser.id, Number(additionalSlots));
      setUsers((current) => current.map((user) => user.id === response.user.id ? response.user : user));
      setAllocationUser(response.user);
      setAdditionalSlots("");
      setAllocationSuccess(`${response.user.name} now has ${response.user.imageQuota} image slots.`);
    } catch (caughtError) {
      setAllocationError(caughtError instanceof ApiError ? caughtError.message : "Could not allocate image slots.");
    } finally {
      setIsAllocating(false);
    }
  }

  const normalUsers = users.filter((user) => user.role === "USER");
  const uploadedImages = users.reduce((total, user) => total + (user._count?.uploads ?? 0), 0);

  return (
    <RoleGate>
      <PageHeader eyebrow="Admin" title="Team members" description="Invite Users into your organisation and keep track of their upload allowances." action={<button type="button" onClick={() => isFormOpen ? closeForm() : beginCreate()} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200">{isFormOpen ? "Close form" : "Add team member"}</button>} />
      <div className="mb-7 grid gap-4 sm:grid-cols-3"><StatCard label="People" value={users.length} detail="Admin and Users" /><StatCard label="Users" value={normalUsers.length} detail="Can upload images" accent="emerald" /><StatCard label="Uploads" value={uploadedImages} detail="Saved by your team" accent="amber" /></div>
      {isFormOpen ? <form onSubmit={submitUser} className="mb-7 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"><div><h2 className="text-base font-bold text-slate-900">{editingUser ? `Edit ${editingUser.name}` : "Add a team member"}</h2><p className="mt-1 text-sm text-slate-500">{editingUser ? "Leave the password blank to keep the current password." : `New accounts receive the configured ${config?.defaultImageQuota ?? "initial"}-image quota and bootstrap password.`}</p></div><div className={`mt-5 grid gap-4 ${editingUser ? "md:grid-cols-3" : "md:grid-cols-2"}`}><Input label="Full name" value={name} onChange={setName} /><Input label="Email" type="email" value={email} onChange={setEmail} />{editingUser ? <Input label="New password" type="password" minLength={config?.passwordMinLength} maxLength={config?.passwordMaxLength} required={false} value={password} onChange={setPassword} /> : null}</div>{error ? <div className="mt-4"><Message>{error}</Message></div> : null}<div className="mt-5 flex justify-end gap-3"><button type="button" onClick={closeForm} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button disabled={isSubmitting} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{isSubmitting ? "Saving…" : editingUser ? "Save changes" : "Add User"}</button></div></form> : null}
      {allocationUser ? <form onSubmit={submitSlotAllocation} className="mb-7 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"><h2 className="text-base font-bold text-slate-900">Allocate image slots to {allocationUser.name}</h2><p className="mt-1 text-sm text-slate-500">Current quota: {allocationUser.imageQuota}. Add up to {config?.maxAdminSlotAllocation ?? "the configured limit"} slots in one allocation.</p><div className="mt-5 max-w-sm"><Input label="Additional image slots" type="number" min={1} max={config?.maxAdminSlotAllocation} value={additionalSlots} onChange={setAdditionalSlots} /></div>{allocationError ? <div className="mt-4"><Message>{allocationError}</Message></div> : null}{allocationSuccess ? <div className="mt-4"><Message tone="success">{allocationSuccess}</Message></div> : null}<div className="mt-5 flex justify-end gap-3"><button type="button" onClick={closeSlotAllocation} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Close</button><button disabled={isAllocating || !config} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{isAllocating ? "Allocating…" : "Allocate slots"}</button></div></form> : null}
      {error && !isFormOpen ? <div className="mb-5"><Message>{error}</Message></div> : null}
      {isLoading ? <LoadingCards /> : null}
      {!isLoading ? <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-4">Member</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Quota</th><th className="px-5 py-4">Uploads</th><th className="px-5 py-4" /></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-slate-100 last:border-0"><td className="px-5 py-4"><p className="font-bold text-slate-800">{user.name}</p><p className="mt-0.5 text-xs text-slate-500">{user.email}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.role === "ADMIN" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>{user.role === "ADMIN" ? "Admin" : "User"}</span></td><td className="px-5 py-4 font-semibold text-slate-700">{user.imageQuota}</td><td className="px-5 py-4 font-semibold text-slate-700">{user._count?.uploads ?? 0}</td><td className="px-5 py-4 text-right">{user.role === "USER" ? <span className="inline-flex flex-wrap justify-end gap-3"><button type="button" onClick={() => beginEdit(user)} className="text-xs font-bold text-indigo-600">Edit / password</button><button type="button" onClick={() => beginSlotAllocation(user)} className="text-xs font-bold text-emerald-700">Add slots</button><button type="button" onClick={() => void removeUser(user)} className="text-xs font-bold text-rose-600">Remove</button></span> : <span className="text-xs text-slate-400">Organisation Admin</span>}</td></tr>)}</tbody></table></div>{users.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No Users have been added yet.</p> : null}</div> : null}
    </RoleGate>
  );
}

function Input({ label, value, onChange, type = "text", minLength, maxLength, min, max, required = true }: { label: string; value: string; onChange: (value: string) => void; type?: string; minLength?: number; maxLength?: number; min?: number; max?: number; required?: boolean }) {
  return <label className="text-sm font-semibold text-slate-700">{label}<input required={required} type={type} minLength={minLength} maxLength={maxLength} min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>;
}
