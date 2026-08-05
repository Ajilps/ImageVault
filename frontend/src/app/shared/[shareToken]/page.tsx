"use client";
/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { PublicSharedImage } from "@/lib/types";

export default function SharedImagePage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [image, setImage] = useState<PublicSharedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    api.publicSharedImage(shareToken)
      .then((response) => { if (active) setImage(response.image); })
      .catch((caughtError) => {
        if (active) setError(caughtError instanceof ApiError ? caughtError.message : "This shared image could not be loaded.");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [shareToken]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-5xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
          <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 font-bold">I</span>
          ImageVault
        </Link>
        {isLoading ? <div className="rounded-3xl border border-white/10 bg-white/5 p-14 text-center text-slate-300">Loading shared image…</div> : null}
        {!isLoading && error ? <div className="rounded-3xl border border-red-300 bg-red-50 p-14 text-center"><h1 className="text-2xl font-bold text-red-900">Public link unavailable</h1><p className="mt-3 font-semibold text-red-700">{error}</p></div> : null}
        {!isLoading && image ? <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl"><div className="grid max-h-[75vh] place-items-center bg-black/30 p-3"><img src={image.downloadUrl} alt={`Public image shared by ${image.uploadedBy.name}`} className="max-h-[70vh] max-w-full rounded-2xl object-contain" /></div><div className="flex flex-col gap-2 p-6 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-lg font-bold">Shared by {image.uploadedBy.name}</h1><p className="mt-1 text-sm text-slate-400">Organisation-public ImageVault upload</p></div><p className="text-sm text-slate-400">{new Date(image.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p></div></article> : null}
      </section>
    </main>
  );
}
