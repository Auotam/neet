"use client";

import dynamic from "next/dynamic";

const MaintenanceForm = dynamic(() => import("./MaintenanceForm"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
          Under maintenance
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          We&apos;ll be back shortly
        </h1>
        <div
          className="mt-8 h-36 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
          aria-hidden
        />
      </div>
    </div>
  ),
});

export default function MaintenanceShell() {
  return <MaintenanceForm />;
}
