"use client";

import { useState, type InputHTMLAttributes } from "react";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function PasswordField({ label, value, onChange, className = "", ...inputProps }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block text-sm font-semibold text-zinc-800">
      {label}
      <span className="relative mt-2 block">
        <input
          {...inputProps}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-3 pr-20 font-normal text-black outline-none transition placeholder:text-zinc-500 focus:border-black focus:ring-4 focus:ring-zinc-200 ${className}`}
        />
        <button
          type="button"
          aria-label={`${isVisible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((current) => !current)}
          className="absolute inset-y-0 right-0 px-3 text-xs font-bold text-zinc-700 hover:text-black"
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}

export function TemporaryPasswordNotice({
  accountLabel,
  password,
  onDismiss,
}: {
  accountLabel: string;
  password: string;
  onDismiss: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <section className="mb-7 rounded-2xl border-2 border-black bg-white p-5" aria-live="polite">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-600">Temporary password</p>
          <h2 className="mt-1 text-lg font-bold text-black">Account created for {accountLabel}</h2>
          <p className="mt-1 text-sm text-zinc-600">Copy this password now. It is shown only in this creation result.</p>
        </div>
        <button type="button" onClick={onDismiss} className="text-xs font-bold text-zinc-600 hover:text-black">Dismiss</button>
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-black">Generated password</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border-2 border-black bg-white px-4 py-3 font-mono text-base font-bold text-black shadow-inner">
          {isVisible ? password : "••••••••••••••••"}
        </code>
        <button type="button" onClick={() => setIsVisible((current) => !current)} className="rounded-xl border border-black px-4 py-2.5 text-sm font-bold text-black hover:bg-zinc-100">
          {isVisible ? "Hide" : "Show"}
        </button>
        <button type="button" onClick={() => void copyPassword()} className="rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800">
          {isCopied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}
