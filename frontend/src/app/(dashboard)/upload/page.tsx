"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { usePublicConfig } from "@/components/public-config-provider";
import { RoleGate } from "@/components/role-gate";
import { LoadingCards, Message, PageHeader, StatCard } from "@/components/ui";
import { ApiError, api, uploadFile } from "@/lib/api";
import type { ManagedUser, Quota } from "@/lib/types";

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { config, error: configError } = usePublicConfig();
  const [members, setMembers] = useState<ManagedUser[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<"idle" | "signing" | "uploading" | "completing">("idle");
  const [fileInputKey, setFileInputKey] = useState(0);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [quotaResponse, membersResponse] = await Promise.all([api.quota(), api.members()]);
      setQuota(quotaResponse.quota);
      setMembers(membersResponse.users.filter((member) => member.id !== user?.id));
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not load upload details.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void loadData(); }, [loadData]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSuccess(null);
    const nextFile = event.target.files?.[0] ?? null;
    if (nextFile && !nextFile.type.startsWith("image/")) {
      setError("Choose an image file (JPEG, PNG, WebP, and similar formats are supported).");
      setFile(null);
      return;
    }
    if (nextFile && config && nextFile.size > config.maxFileSize) {
      setError(`This file is larger than the configured ${formatBytes(config.maxFileSize)} limit.`);
      setFile(null);
      return;
    }
    setError(null);
    setFile(nextFile);
  }

  function toggleTag(userId: string) {
    if (visibility === "PRIVATE") return;
    setSelectedTags((current) => {
      if (current.includes(userId)) return current.filter((id) => id !== userId);
      if (config && current.length >= config.maxTagsPerImage) {
        setError(`You can tag up to ${config.maxTagsPerImage} members per image.`);
        return current;
      }
      setError(null);
      return [...current, userId];
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose an image before uploading.");
      return;
    }
    setError(null); setSuccess(null); setIsUploading(true);

    try {
      setUploadStage("signing");
      const uploadResponse = await api.createUploadUrl({ fileName: file.name, contentType: file.type });
      if (file.size > uploadResponse.upload.maxFileSize) {
        throw new ApiError(`This file is larger than the ${Math.round(uploadResponse.upload.maxFileSize / 1024 / 1024)} MB limit.`, 400);
      }
      setUploadStage("uploading");
      await uploadFile(uploadResponse.upload.uploadUrl, file);
      setUploadStage("completing");
      await api.completeUpload({ objectKey: uploadResponse.upload.objectKey, tagUserIds: selectedTags, visibility });
      setSuccess("Image uploaded and saved to your organisation gallery.");
      setFile(null); setSelectedTags([]); setVisibility("PUBLIC");
      setFileInputKey((current) => current + 1);
      await loadData();
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "The image could not be uploaded.");
    } finally {
      setIsUploading(false);
      setUploadStage("idle");
    }
  }

  return (
    <RoleGate>
      <PageHeader eyebrow="User workspace" title="Upload an image" description="Images are private to your organisation. Tag teammates for a direct notification, or leave tags empty to notify the whole team." action={<button type="button" onClick={() => router.push("/gallery")} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">View gallery</button>} />
      {configError ? <div className="mb-6"><Message>{configError}</Message></div> : null}
      {isLoading ? <LoadingCards /> : <><div className="mb-7 grid gap-4 sm:grid-cols-3"><StatCard label="Upload quota" value={`${quota?.used ?? 0} / ${quota?.total ?? 0}`} detail="Images saved to your account" /><StatCard label="Available" value={quota?.remaining ?? 0} detail="Uploads left before a pack is needed" accent="emerald" /><StatCard label="Tags" value={selectedTags.length} detail="Members selected for notification" accent="amber" /></div>
      {quota && quota.remaining === 0 ? <div className="mb-6"><Message tone="info">Your upload quota is used. {config ? `Buy another ${config.slotPackSize}-image pack for ₹${config.slotPackPriceInr} to continue.` : "Open Upload packs to add capacity."}</Message></div> : null}
      <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">{error ? <div className="mb-5"><Message>{error}</Message></div> : null}{success ? <div className="mb-5"><Message tone="success">{success}</Message></div> : null}<label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 text-center transition hover:border-indigo-300 hover:bg-indigo-50/30"><span className="grid size-12 place-items-center rounded-full bg-white text-xl text-indigo-600 shadow-sm">↑</span><span className="mt-4 text-sm font-bold text-slate-800">{file ? file.name : "Choose an image to upload"}</span><span className="mt-1 text-xs text-slate-500">Images only{config ? ` · maximum ${formatBytes(config.maxFileSize)}` : " · loading configured size limit"}</span><input key={fileInputKey} disabled={isUploading || !config} type="file" accept="image/*" className="sr-only" onChange={onFileChange} /></label><fieldset className="mt-7"><legend className="text-base font-bold text-slate-800">Who can view this image?</legend><p className="mt-1 text-sm text-slate-500">Public images are visible to everyone in your organisation. Private images are visible only to you.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><VisibilityOption value="PUBLIC" selected={visibility} title="Organisation public" description="Visible to all members and can notify teammates." onSelect={() => setVisibility("PUBLIC")} /><VisibilityOption value="PRIVATE" selected={visibility} title="Private to me" description="Hidden from every other User and Admin." onSelect={() => { setVisibility("PRIVATE"); setSelectedTags([]); setError(null); }} /></div></fieldset><div className="mt-7"><div className="flex items-end justify-between gap-4"><div><h2 className="text-base font-bold text-slate-800">Notify specific teammates</h2><p className="mt-1 text-sm text-slate-500">{visibility === "PRIVATE" ? "Private images do not notify or tag other members." : "No selection sends a workspace-wide notification."}</p></div><span className="text-xs font-semibold text-slate-400">{visibility === "PRIVATE" ? "Disabled for private images" : config ? `${selectedTags.length} / ${config.maxTagsPerImage}` : "Optional"}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{members.map((member) => <label key={member.id} className={`flex items-center gap-3 rounded-xl border p-3 transition ${visibility === "PRIVATE" ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-55" : selectedTags.includes(member.id) ? "cursor-pointer border-indigo-300 bg-indigo-50" : "cursor-pointer border-slate-200 hover:border-slate-300"}`}><input type="checkbox" disabled={isUploading || visibility === "PRIVATE"} checked={selectedTags.includes(member.id)} onChange={() => toggleTag(member.id)} className="size-4 accent-indigo-600" /><span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-700">{member.name}</span><span className="block truncate text-xs text-slate-400">{member.email}</span></span></label>)}</div></div><div className="mt-8 flex justify-end"><button disabled={isUploading || !config || !file || (quota?.remaining ?? 0) < 1} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 disabled:cursor-not-allowed disabled:opacity-50">{uploadStage === "signing" ? "Preparing secure upload…" : uploadStage === "uploading" ? "Uploading to storage…" : uploadStage === "completing" ? "Saving image…" : "Upload image"}</button></div></form></>}
    </RoleGate>
  );
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function VisibilityOption({ value, selected, title, description, onSelect }: { value: "PUBLIC" | "PRIVATE"; selected: "PUBLIC" | "PRIVATE"; title: string; description: string; onSelect: () => void }) {
  return <label className={`cursor-pointer rounded-xl border p-4 ${selected === value ? "border-indigo-300 bg-indigo-50" : "border-slate-200"}`}><span className="flex items-center gap-3"><input type="radio" name="visibility" value={value} checked={selected === value} onChange={onSelect} className="size-4 accent-indigo-600" /><span className="font-bold text-slate-800">{title}</span></span><span className="mt-2 block pl-7 text-sm text-slate-500">{description}</span></label>;
}
