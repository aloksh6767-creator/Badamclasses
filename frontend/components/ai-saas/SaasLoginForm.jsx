"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import SaasNav from "@/components/ai-saas/SaasNav";
import { getFirebaseAuthClient, getFirebaseClientStatus } from "@/lib/firebaseClient";

const firebaseErrorMessages = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/email-already-in-use": "An account already exists for this email.",
  "auth/weak-password": "Use a stronger password with at least 6 characters.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/network-request-failed": "Network error. Please try again."
};

export default function SaasLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/ai-saas/dashboard";
  const firebaseStatus = useMemo(() => getFirebaseClientStatus(), []);
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuthClient();
    if (!auth) return undefined;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace(redirectTo.startsWith("/ai-saas") ? redirectTo : "/ai-saas/dashboard");
      }
    });

    return unsubscribe;
  }, [redirectTo, router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const auth = getFirebaseAuthClient();
    if (!auth) {
      setError("Firebase auth is not configured. Add the public Firebase environment variables and restart the dev server.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(result.user, { displayName: name.trim() });
        }
        setNotice("Account created. Opening your AI dashboard...");
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        setNotice("Signed in. Opening your AI dashboard...");
      }
      router.replace(redirectTo.startsWith("/ai-saas") ? redirectTo : "/ai-saas/dashboard");
    } catch (err) {
      setError(firebaseErrorMessages[err?.code] || err?.message || "Firebase auth failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080b12] text-slate-100">
      <SaasNav />
      <section className="mx-auto grid min-h-[calc(100vh-73px)] w-[92%] max-w-6xl items-center gap-8 py-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-200">Secure access</p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Sign in to your learning command center.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            AstraLearn AI uses Firebase email and password auth for this product demo only. Existing education login and checkout flows remain separate.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-4">Protected dashboard</div>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-4">Clear env checks</div>
            <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-4">No secret exposure</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[8px] border border-white/10 bg-slate-950/78 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
          <div className="mb-6 flex rounded-[8px] border border-white/10 bg-white/[0.035] p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-teal-300 text-slate-950" : "text-slate-300"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${mode === "signup" ? "bg-teal-300 text-slate-950" : "text-slate-300"}`}
            >
              Sign up
            </button>
          </div>

          {!firebaseStatus.configured ? (
            <div className="mb-5 rounded-[8px] border border-amber-300/35 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
              Firebase is not configured yet. Add these public keys to `frontend/.env.local`: {firebaseStatus.missingKeys.join(", ")}.
            </div>
          ) : null}

          {error ? (
            <div className="mb-5 rounded-[8px] border border-rose-300/35 bg-rose-300/10 p-4 text-sm leading-6 text-rose-100">{error}</div>
          ) : null}
          {notice ? (
            <div className="mb-5 rounded-[8px] border border-emerald-300/35 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100">{notice}</div>
          ) : null}

          {mode === "signup" ? (
            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#080b12] px-4 py-3 text-white outline-none transition focus:border-teal-300/70" placeholder="Avery Stone" />
            </label>
          ) : null}

          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">Email</span>
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#080b12] px-4 py-3 text-white outline-none transition focus:border-teal-300/70" placeholder="you@company.com" />
          </label>

          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">Password</span>
            <input required type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#080b12] px-4 py-3 text-white outline-none transition focus:border-teal-300/70" placeholder="At least 6 characters" />
          </label>

          <button disabled={loading || !firebaseStatus.configured} className="w-full rounded-xl bg-teal-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-55">
            {loading ? "Working..." : mode === "signup" ? "Create account" : "Login to dashboard"}
          </button>

          <p className="mt-5 text-center text-sm text-slate-400">
            Need the public site? <Link href="/ai-saas" className="font-semibold text-teal-200">Back to AstraLearn AI</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
