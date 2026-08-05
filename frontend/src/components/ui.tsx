import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, detail, accent = "indigo" }: { label: string; value: string | number; detail: string; accent?: "indigo" | "emerald" | "amber" }) {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${accents[accent]}`}>{label}</span>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </article>
  );
}

export function Message({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  const tones = {
    error: "border-red-300 bg-red-50 font-semibold text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    info: "border-indigo-200 bg-indigo-50 text-indigo-700",
  };

  return <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function LoadingCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-40 animate-pulse rounded-2xl bg-slate-200" />
      ))}
    </div>
  );
}
