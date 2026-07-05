"use client";

import React, { useEffect, useState } from "react";
import { Logo } from "@/components/ui";

type Mode = "otp" | "code" | "open" | "loading";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("loading");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.mode === "open") window.location.href = "/";
        else setMode(d.mode === "otp" ? "otp" : "code");
      })
      .catch(() => setMode("code"));
  }, []);

  function goHome() {
    const from = new URLSearchParams(window.location.search).get("from");
    window.location.href = from && from.startsWith("/") ? from : "/";
  }

  async function post(url: string, body: object) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { ok, data } = await post("/api/auth/request", { email });
      if (ok) {
        setStep("otp");
        setOtp(typeof data.devOtp === "string" ? data.devOtp : "");
        setNotice(`We sent a 6-digit code to ${email.trim()}. It's valid for ~10 minutes.`);
      } else {
        setError(data.error ?? "Could not send the code.");
      }
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await post("/api/auth/verify", { email, otp });
      if (ok) return goHome();
      setError(data.error ?? "Incorrect or expired code.");
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAccessCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await post("/api/auth", { code });
      if (ok) return goHome();
      setError(data.error ?? "Incorrect access code.");
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-center text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none";
  const buttonCls =
    "w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50";

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="mb-4 flex justify-center">
          <Logo src="/logos/primary-logo.png" fallbackSrc="/logos/primary-mark.svg" alt="QTC JV" fallback="QTC JV" className="h-14 w-auto" />
        </div>
        <h1 className="text-lg font-extrabold text-slate-900">H&amp;S Performance Dashboard</h1>
        <p className="mt-1 text-xs text-slate-500">Restricted access — QTC JV &amp; Bouygues Construction personnel only.</p>

        {mode === "loading" && <p className="mt-6 text-xs text-slate-400">Loading…</p>}

        {mode === "otp" && step === "email" && (
          <form onSubmit={sendCode} className="mt-6 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.name@company.com"
              autoFocus
              className={inputCls}
            />
            <button type="submit" disabled={busy || !email} className={buttonCls}>
              {busy ? "Sending code…" : "Email me a code"}
            </button>
          </form>
        )}

        {mode === "otp" && step === "otp" && (
          <form onSubmit={verifyCode} className="mt-6 space-y-3">
            {notice && <p className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-xs text-slate-600">{notice}</p>}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit code"
              autoFocus
              className={`${inputCls} tracking-[0.4em] font-bold`}
            />
            <button type="submit" disabled={busy || otp.length !== 6} className={buttonCls}>
              {busy ? "Checking…" : "Enter dashboard"}
            </button>
            <div className="flex justify-between text-[11px]">
              <button type="button" onClick={() => { setStep("email"); setError(null); setNotice(null); }} className="text-slate-400 hover:text-slate-700">
                ← Different email
              </button>
              <button type="button" onClick={(e) => sendCode(e as unknown as React.FormEvent)} disabled={busy} className="text-brand hover:text-brand-dark">
                Resend code
              </button>
            </div>
          </form>
        )}

        {mode === "code" && (
          <form onSubmit={submitAccessCode} className="mt-6 space-y-3">
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter access code"
              autoFocus
              className={inputCls}
            />
            <button type="submit" disabled={busy || !code} className={buttonCls}>
              {busy ? "Checking…" : "Enter dashboard"}
            </button>
          </form>
        )}

        {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        <p className="mt-6 text-[11px] text-slate-400">Need access? Contact the QTC JV H&amp;S department.</p>
      </div>
    </div>
  );
}
