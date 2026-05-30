"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientError } from "@/lib/errorReporting";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    void reportClientError({
      source: "frontend-global-boundary",
      title: "Global error boundary triggered",
      message: error?.message || "Unexpected app error",
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
    <html>
      <body>
        <main className="mx-auto grid min-h-[70vh] w-[92%] max-w-3xl place-items-center py-10 text-center">
          <div className="rounded-2xl border border-white/10 bg-card/70 p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">App Error</p>
            <h1 className="mt-3 font-display text-3xl">Please refresh the page</h1>
            <p className="mt-2 text-slate-300">{error?.message || "Unexpected error occurred."}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button onClick={handleRefresh} className="rounded-xl bg-accent px-4 py-2 font-semibold text-white">Refresh Page</button>
              <button onClick={() => reset()} className="rounded-xl border border-orange-300/40 px-4 py-2 text-white">Try Again</button>
              <Link href="/" className="rounded-xl border border-white/20 px-4 py-2 text-white">Go Home</Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
