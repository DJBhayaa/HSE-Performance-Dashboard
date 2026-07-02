"use client";

import React, { useState } from "react";
import { Logo } from "@/components/ui";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        const from = new URLSearchParams(window.location.search).get("from");
        window.location.href = from && from.startsWith("/") ? from : "/";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Incorrect access code.");
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="mb-4 flex justify-center">
          <Logo src="/logos/primary-logo.png" fallbackSrc="/logos/primary-mark.svg" alt="QTC JV" fallback="QTC JV" className="h-14 w-auto" />
        </div>
        <h1 className="text-lg font-extrabold text-slate-900">H&amp;S Performance Dashboard</h1>
        <p className="mt-1 text-xs text-slate-500">
          Restricted access — QTC JV &amp; Bouygues Construction personnel only.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter access code"
            autoFocus
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-center text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !code}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? "Checking…" : "Enter dashboard"}
          </button>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}
        </form>

        <p className="mt-6 text-[11px] text-slate-400">
          Need access? Contact the QTC JV H&amp;S department.
        </p>
      </div>
    </div>
  );
}
