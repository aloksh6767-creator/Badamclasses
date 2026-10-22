"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminPanel from "@/components/AdminPanel";
import { apiFetch } from "@/lib/api";
import { getToken, getUser, isAdminUser, logout } from "@/lib/auth";

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    const localUser = getUser();
    const token = getToken();

    if (!localUser || !token || !isAdminUser(localUser)) {
      setUser(null);
      setReady(true);
      return;
    }

    (async () => {
      try {
        const verifiedUser = await apiFetch("/auth/me");
        if (!isAdminUser(verifiedUser)) {
          logout();
          setUser(null);
          setError("Your account does not have admin access.");
        } else {
          setUser(verifiedUser);
          setWarning("");
        }
      } catch (apiError) {
        const message = String(apiError?.message || "").trim();
        const isBackendUnavailable =
          message === "Server is temporarily unavailable. Please try again." ||
          message === "Server response is taking too long. Please retry in a moment." ||
          message.includes("Production API URL is not configured");

        if (isBackendUnavailable && isAdminUser(localUser)) {
          setUser(localUser);
          setError("");
          setWarning("Backend is temporarily unavailable. Showing local admin panel in fallback mode.");
        } else {
          setUser(null);
          setError(message || "Admin session verification failed.");
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-700">
        <p role="status" className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm shadow-sm">Loading admin workspace…</p>
      </main>
    );
  }

  if (!isAdminUser(user)) {
    const actionMessage = error
      ? "Backend down hai ya admin session verify nahi ho pa raha. Admin login ke baad panel open hoga."
      : "Please sign in with an admin or instructor account to manage courses, offers, live controls, and support chat.";

    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 text-slate-900">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Restricted area</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Admin access required</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{actionMessage}</p>
          {error ? (
            <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/login?redirect=%2Fadmin"
              className="inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Login
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Back to website
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <AdminPanel user={user} warning={warning} />;
}
