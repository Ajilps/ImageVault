import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[.9fr_1.1fr]">
      <section className="hidden bg-[radial-gradient(circle_at_0%_20%,rgba(255,255,255,.18),transparent_40%),radial-gradient(circle_at_80%_85%,rgba(255,255,255,.08),transparent_40%)] p-12 text-white lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3 text-lg font-bold">
          <span className="grid size-10 place-items-center rounded-xl bg-white text-indigo-600">I</span>
          ImageVault
        </Link>
        <div className="my-auto max-w-md">
          <p className="text-sm font-bold uppercase tracking-[.16em] text-indigo-200">Your private workspace</p>
          <h1 className="mt-5 text-5xl font-bold tracking-[-.045em]">Every team image, right where it belongs.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-200">Manage uploads, image packs, and notifications in one calm, secure place.</p>
        </div>
        <p className="text-sm text-slate-300">Built for organisations that need simple image control.</p>
      </section>
      <section className="flex items-center justify-center bg-zinc-100 p-6 sm:p-10">{children}</section>
    </main>
  );
}
