"use client";

import { useState } from "react";

export default function MaintenancePage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/maintenance-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not unlock");
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
          Under maintenance
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          We&apos;ll be back shortly
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          This NEET practice site is temporarily unavailable to the public. If
          you have access, enter the maintenance password to continue.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="maint-pass"
              className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              Password
            </label>
            <input
              id="maint-pass"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none ring-emerald-500/40 focus:border-emerald-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950"
              disabled={busy}
            />
          </div>
          {error ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !password.trim()}
            className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
