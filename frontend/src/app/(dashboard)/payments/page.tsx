"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";

import { usePublicConfig } from "@/components/public-config-provider";
import { RoleGate } from "@/components/role-gate";
import { LoadingCards, Message, PageHeader, StatCard } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import type { Payment, Quota } from "@/lib/types";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOptions = { key: string; amount: number; currency: string; name: string; description: string; order_id: string; handler: (response: RazorpayResponse) => void; modal: { ondismiss: () => void }; theme: { color: string } };

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentsPage() {
  const { config, error: configError } = usePublicConfig();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [packs, setPacks] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [paymentResponse, quotaResponse] = await Promise.all([api.payments(), api.quota()]);
      setPayments(paymentResponse.payments);
      setQuota(quotaResponse.quota);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not load payment information.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  async function beginPayment() {
    if (!config) return;
    setError(null); setSuccess(null); setIsPaying(true);
    try {
      const available = await loadRazorpay();
      if (!available || !window.Razorpay) throw new ApiError("Razorpay Checkout could not be loaded. Check your connection and try again.", 503);
      const response = await api.createPaymentOrder(packs);
      const checkout = new window.Razorpay({
        key: response.order.keyId,
        amount: response.order.amount,
        currency: response.order.currency,
        name: "ImageVault",
        description: `${response.order.slotsPurchased} additional image uploads`,
        order_id: response.order.orderId,
        modal: {
          ondismiss: () => {
            setIsPaying(false);
            setError("Checkout was closed before payment verification.");
          },
        },
        theme: { color: "#000000" },
        handler: (payment) => {
          void api.verifyPayment({
            orderId: payment.razorpay_order_id,
            paymentId: payment.razorpay_payment_id,
            signature: payment.razorpay_signature,
          }).then(async () => {
            setSuccess("Payment verified. Your upload quota has been updated.");
            await loadData();
          }).catch((caughtError: unknown) => {
            setError(caughtError instanceof ApiError ? caughtError.message : "Your payment could not be verified.");
          }).finally(() => setIsPaying(false));
        },
      });
      checkout.open();
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : "Could not start the payment.");
      setIsPaying(false);
    }
  }

  const packOptions = config
    ? Array.from({ length: config.maxSlotPacksPerOrder }, (_, index) => index + 1)
    : [];
  const successfulPacks = config
    ? payments.filter((payment) => payment.status === "SUCCESS").reduce((total, payment) => total + payment.slotsPurchased / config.slotPackSize, 0)
    : 0;

  return (
    <RoleGate>
      <PageHeader eyebrow="User workspace" title="Upload packs" description={config ? `Every pack adds ${config.slotPackSize} image uploads for ₹${config.slotPackPriceInr}. Payments are verified before your quota changes.` : "Payment options are loading from application configuration."} />
      {configError ? <div className="mb-5"><Message>{configError}</Message></div> : null}
      {isLoading ? <LoadingCards /> : <><div className="mb-7 grid gap-4 sm:grid-cols-3"><StatCard label="Current quota" value={`${quota?.used ?? 0} / ${quota?.total ?? 0}`} detail="Images already used" /><StatCard label="Available" value={quota?.remaining ?? 0} detail="Uploads ready to use" accent="emerald" /><StatCard label="Successful packs" value={successfulPacks} detail="Confirmed packs" accent="amber" /></div>
      <section className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><article className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-xl shadow-indigo-200"><p className="text-sm font-bold uppercase tracking-[.15em] text-indigo-200">Add capacity</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Flexible upload capacity.</h2><p className="mt-3 max-w-md text-sm leading-6 text-indigo-100">Choose the number of packs you need. Pricing and pack size are controlled by server configuration.</p><div className="mt-7 flex items-center justify-between rounded-xl bg-white/10 p-4"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-200">Pack count</p><p className="mt-1 text-sm text-white">{config ? packs * config.slotPackSize : 0} extra uploads</p></div><select aria-label="Pack count" value={packs} disabled={!config || isPaying} onChange={(event) => setPacks(Number(event.target.value))} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none">{packOptions.map((count) => <option key={count} value={count}>{count} pack{count > 1 ? "s" : ""}</option>)}</select></div><p className="mt-6 text-3xl font-bold">₹{config ? packs * config.slotPackPriceInr : 0}</p><button type="button" disabled={isPaying || !config} onClick={() => void beginPayment()} className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60">{isPaying ? "Waiting for checkout…" : `Buy ${config ? packs * config.slotPackSize : 0} upload slots`}</button></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Payment history</h2><p className="mt-1 text-sm text-slate-500">Your Razorpay order status and quota purchases.</p>{error ? <div className="mt-4"><Message>{error}</Message></div> : null}{success ? <div className="mt-4"><Message tone="success">{success}</Message></div> : null}<div className="mt-5 space-y-3">{payments.length ? payments.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div><p className="text-sm font-bold text-slate-800">{payment.slotsPurchased} upload slots</p><p className="mt-1 text-xs text-slate-400">{new Date(payment.createdAt).toLocaleDateString()} · {payment.transactionId}</p></div><div className="text-right"><p className="text-sm font-bold text-slate-800">₹{payment.amount}</p><span className={`mt-1 inline-block rounded-full px-2 py-1 text-[10px] font-bold ${payment.status === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : payment.status === "FAILED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{payment.status}</span></div></div>) : <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No payment history yet.</p>}</div></article></section></>}
    </RoleGate>
  );
}
