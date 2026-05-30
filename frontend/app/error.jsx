"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientError } from "@/lib/errorReporting";

export default function Error({ error, reset }) {
  useEffect(() => {
    void reportClientError({
      source: "frontend-boundary",
      title: "Route error boundary triggered",
      message: error?.message || "Unexpected route error",
      stack: error?.stack,
      page: typeof window !== "undefined" ? window.location.href : ""
    });
  }, [error]);

  const handleRefresh = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
      return;
    }
    reset();
  };

  return (
    <main className="mx-auto grid min-h-[70vh] w-[92%] max-w-3xl place-items-center py-10 text-center">
      <div className="rounded-2xl border border-white/10 bg-card/70 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Something went wrong</p>
        <h1 className="mt-3 font-display text-3xl">We hit a snag</h1>
        <p className="mt-2 text-slate-300">{error?.message || "Unexpected error occurred."}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button onClick={() => reset()} className="rounded-xl bg-accent px-4 py-2 font-semibold text-white">Try Again</button>
          <button onClick={handleRefresh} className="rounded-xl border border-orange-300/40 px-4 py-2 text-white">Refresh Page</button>
          <Link href="/" className="rounded-xl border border-white/20 px-4 py-2 text-white">Go Home</Link>
        </div>
      </div>
    </main>
  );
}
