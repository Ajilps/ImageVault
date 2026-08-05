"use client";
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { RoleGate } from "@/components/role-gate";
import { LoadingCards, Message, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import type { ImageRecord, ManagedUser } from "@/lib/types";

export default function GalleryPage() {
  const { user } = useAuth();
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [members, setMembers] = useState<ManagedUser[]>([]);
  const [preview, setPreview] = useState<ImageRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taggedUserId, setTaggedUserId] = useState("");
  const [sharingImageId, setSharingImageId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [imageResponse, memberResponse] = await Promise.all([
        api.images(taggedUserId || undefined),
        api.members(),
      ]);
      setImages(imageResponse.images);
      setMembers(memberResponse.users);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not load the gallery.");
    } finally {
      setIsLoading(false);
    }
  }, [taggedUserId]);

  useEffect(() => { void loadImages(); }, [loadImages]);

  useEffect(() => {
    if (isLoading) return;

    const url = new URL(window.location.href);
    const requestedImageId = url.searchParams.get("imageId");
    if (!requestedImageId) return;

    url.searchParams.delete("imageId");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);

    const requestedImage = images.find((image) => image.id === requestedImageId);
    if (requestedImage) {
      setPreview(requestedImage);
    } else {
      setError("The notification image is no longer available in your gallery.");
    }
  }, [images, isLoading]);

  function publicLink(shareToken: string) {
    return `${window.location.origin}/shared/${encodeURIComponent(shareToken)}`;
  }

  async function createShare(image: ImageRecord) {
    setError(null);
    setShareMessage(null);
    setSharingImageId(image.id);
    try {
      const response = await api.createImageShare(image.id);
      setImages((current) => current.map((item) => item.id === image.id ? { ...item, shareToken: response.share.shareToken } : item));
      setShareUrl(publicLink(response.share.shareToken));
      setShareMessage("Public link created. Anyone with this link can view the image until you revoke it.");
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not create the public link.");
    } finally {
      setSharingImageId(null);
    }
  }

  async function copyShare(image: ImageRecord) {
    if (!image.shareToken) return;
    const link = publicLink(image.shareToken);
    setShareUrl(link);
    try {
      await navigator.clipboard.writeText(link);
      setShareMessage("Public link copied to the clipboard.");
    } catch {
      setShareMessage("Copy the public link shown below.");
    }
  }

  async function revokeShare(image: ImageRecord) {
    if (!window.confirm("Revoke this public link? Anyone using it will immediately lose access.")) return;
    setError(null);
    setSharingImageId(image.id);
    try {
      await api.revokeImageShare(image.id);
      setImages((current) => current.map((item) => item.id === image.id ? { ...item, shareToken: null } : item));
      setShareUrl(null);
      setShareMessage("Public link revoked.");
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not revoke the public link.");
    } finally {
      setSharingImageId(null);
    }
  }

  const tagOptions = [...members].sort((left, right) => left.name.localeCompare(right.name));

  return (
    <RoleGate>
      <PageHeader
        eyebrow={user?.role === "ADMIN" ? "Admin" : "Shared workspace"}
        title="Organisation gallery"
        description="Browse organisation-public images and your own private uploads. Every file is served through a short-lived signed link."
        action={
          <select value={taggedUserId} onChange={(event) => setTaggedUserId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500">
            <option value="">All image tags</option>
            {tagOptions.map((tag) => <option key={tag.id} value={tag.id}>Tagged: {tag.name}</option>)}
          </select>
        }
      />
      {error ? <div className="mb-5"><Message>{error}</Message></div> : null}
      {shareMessage ? <div className="mb-5"><Message tone="success"><span>{shareMessage}</span>{shareUrl ? <span className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center"><input aria-label="Public image link" readOnly value={shareUrl} className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-slate-700" /><a href={shareUrl} target="_blank" rel="noreferrer" className="font-bold text-emerald-800 underline">Open link</a></span> : null}</Message></div> : null}
      {isLoading ? <LoadingCards /> : null}
      {!isLoading && images.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><p className="text-lg font-bold text-slate-800">No visible images yet</p><p className="mt-2 text-sm text-slate-500">Public organisation images and your own private uploads will appear here.</p></div> : null}
      {!isLoading && images.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{images.map((image) => <ImageCard key={image.id} image={image} canManageShare={user?.role === "USER" && image.uploadedBy.id === user.id && image.visibility === "PUBLIC"} isSharing={sharingImageId === image.id} onCreateShare={() => void createShare(image)} onCopyShare={() => void copyShare(image)} onRevokeShare={() => void revokeShare(image)} onPreview={() => setPreview(image)} />)}</div> : null}
      {preview ? <div role="dialog" aria-modal="true" aria-label={`Image uploaded by ${preview.uploadedBy.name}`} className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4" onClick={() => setPreview(null)}><div className="relative max-h-[90vh] max-w-5xl overflow-auto rounded-2xl bg-white p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}><button type="button" autoFocus aria-label="Close image preview" onClick={() => setPreview(null)} className="absolute right-5 top-5 z-10 rounded-full bg-slate-950/80 px-3 py-1.5 text-sm font-bold text-white">Close</button><img src={preview.downloadUrl} alt={`Uploaded by ${preview.uploadedBy.name}`} className="max-h-[82vh] w-auto rounded-xl object-contain" /></div></div> : null}
    </RoleGate>
  );
}

function ImageCard({ image, canManageShare, isSharing, onCreateShare, onCopyShare, onRevokeShare, onPreview }: { image: ImageRecord; canManageShare: boolean; isSharing: boolean; onCreateShare: () => void; onCopyShare: () => void; onRevokeShare: () => void; onPreview: () => void }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button type="button" onClick={onPreview} className="block aspect-[4/3] w-full overflow-hidden bg-slate-100 text-left">
        <img src={image.downloadUrl} alt={`Uploaded by ${image.uploadedBy.name}`} className="size-full object-cover transition duration-300 hover:scale-105" />
      </button>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-800">{image.uploadedBy.name}</p><p className="mt-1 text-xs text-slate-400">{new Date(image.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p></div><span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${image.visibility === "PRIVATE" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{image.visibility === "PRIVATE" ? "Private" : "Organisation public"}</span></div>
        <div className="mt-4 flex flex-wrap gap-1.5">{image.tags.length ? image.tags.map((tag) => <span key={tag.id} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">#{tag.name}</span>) : <span className="text-xs text-slate-400">{image.visibility === "PRIVATE" ? "Only you can view this image" : "Shared with organisation"}</span>}</div>
        {canManageShare ? <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">{image.shareToken ? <><button type="button" disabled={isSharing} onClick={onCopyShare} className="text-xs font-bold text-indigo-600 disabled:opacity-50">Copy public link</button><button type="button" disabled={isSharing} onClick={onRevokeShare} className="text-xs font-bold text-rose-600 disabled:opacity-50">{isSharing ? "Revoking…" : "Revoke link"}</button></> : <button type="button" disabled={isSharing} onClick={onCreateShare} className="text-xs font-bold text-indigo-600 disabled:opacity-50">{isSharing ? "Creating link…" : "Create public link"}</button>}</div> : null}
      </div>
    </article>
  );
}
