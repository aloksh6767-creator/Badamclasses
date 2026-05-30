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
          message === "Server response is taking too long. Please retry in a moment.";

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
      <main className="mx-auto grid min-h-[70vh] w-[92%] max-w-5xl place-items-center py-10">
        <p className="text-slate-300">Loading admin panel...</p>
      </main>
    );
  }

  if (!isAdminUser(user)) {
    const actionMessage = error
      ? "Backend down hai ya admin session verify nahi ho pa raha. Admin login ke baad panel open hoga."
      : "Please sign in with an admin or instructor account to manage courses, offers, live controls, and support chat.";

    return (
      <main className="mx-auto grid min-h-[70vh] w-[92%] max-w-2xl place-items-center py-10">
        <section className="w-full rounded-2xl border border-white/10 bg-card/70 p-6 text-center backdrop-blur">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-orange-300">Restricted Area</p>
          <h1 className="font-display text-3xl text-white">Admin Panel Access Required</h1>
          <p className="mt-3 text-sm text-slate-300">{actionMessage}</p>
          {error ? (
            <div className="mt-4 rounded-xl border border-orange-300/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
              {error}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/login?redirect=%2Fadmin"
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400"
            >
              Login
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-orange-300"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <AdminPanel user={user} warning={warning} />;
}
