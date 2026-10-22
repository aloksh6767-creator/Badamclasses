"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearExpiredAuth, getDefaultRouteForUser, getSafeRedirectPath, getToken, getUser, saveAuth } from "@/lib/auth";
import AuthShowcase from "@/components/AuthShowcase";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm7 9a7 7 0 0 0-14 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Zm4 4v2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon({ hidden }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      {hidden ? <path d="M4 20 20 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /> : null}
    </svg>
  );
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() => {
    if (searchParams.get("registered") === "1") {
      return "Account created successfully. Please login to continue.";
    }
    if (searchParams.get("reset") === "1") {
      return "Password reset successful. Please login with your new password.";
    }
    return "";
  });
  const [loading, setLoading] = useState(false);
  const redirectTarget = getSafeRedirectPath(searchParams.get("redirect"), "");

  useEffect(() => {
    let cancelled = false;
    const cameFromSignupOrReset = searchParams.get("registered") === "1" || searchParams.get("reset") === "1";

    if (cameFromSignupOrReset) {
      clearExpiredAuth();
      return undefined;
    }

    const existingUser = getUser();
    const token = getToken();
    if (!existingUser || !token) {
      return undefined;
    }

    const validateExistingSession = async () => {
      try {
        const data = await apiFetch("/auth/me");
        const validUser = data?.user || existingUser;
        if (!cancelled) {
          window.location.href = redirectTarget || getDefaultRouteForUser(validUser);
        }
      } catch {
        if (!cancelled) {
          clearExpiredAuth();
        }
      }
    };

    validateExistingSession();
    return () => {
      cancelled = true;
    };
  }, [redirectTarget, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail, password })
      });
      saveAuth(data?.token, data?.user);
      const redirect = getSafeRedirectPath(searchParams.get("redirect"), getDefaultRouteForUser(data?.user));
      window.location.href = redirect || getDefaultRouteForUser(data?.user);
    } catch (err) {
      const message = String(err.message || "").trim();
      setError(message || "Login service unavailable. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShowcase mode="login">
      <form onSubmit={handleSubmit} className="auth-form-stack mx-auto w-full max-w-[32rem]">
        <div className="mb-9 text-left">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-blue-400">Welcome Back</p>
          <h1 className="font-display text-3xl font-bold leading-[1.12] text-white sm:text-[2.35rem]">Continue your learning journey</h1>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-orange-300/40 bg-orange-500/10 p-3 text-sm text-orange-100">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mb-4 rounded-xl border border-emerald-300/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}

        <label className="mb-5 block">
          <span className="mb-2 block text-sm font-semibold text-white">Email Address</span>
          <span className="auth-input-wrap flex min-h-[4.1rem] items-center gap-3 rounded-xl border border-blue-400/65 bg-[#04132f]/82 px-5 py-3 text-blue-300 transition focus-within:border-blue-300 focus-within:bg-[#071a3c]">
            <UserIcon />
            <input type="email" required autoComplete="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500 sm:text-base" />
          </span>
        </label>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-semibold text-white">Password</span>
          <span className="auth-input-wrap flex min-h-[4.1rem] items-center gap-3 rounded-xl border border-blue-400/65 bg-[#04132f]/82 px-5 py-3 text-blue-300 transition focus-within:border-blue-300 focus-within:bg-[#071a3c]">
            <LockIcon />
            <input type={showPassword ? "text" : "password"} required autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500 sm:text-base" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-300 transition hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
              <EyeIcon hidden={!showPassword} />
            </button>
          </span>
        </label>

        <div className="mb-7 flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2.5 text-slate-200">
            <input type="checkbox" className="h-5 w-5 rounded border-blue-300/50 bg-transparent accent-blue-500" />
            Remember me
          </label>
          <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim())}` : ""}`} className="font-medium text-blue-400 transition hover:text-blue-200">
            Forgot Password?
          </Link>
        </div>

        <button disabled={loading} className="auth-submit-btn glass-login-button btn-light-wrap relative w-full overflow-hidden rounded-xl px-4 py-4 text-base font-bold text-white transition disabled:translate-y-0 disabled:opacity-70">
          <span className="btn-light-sweep" />
          <span className="relative z-10">
          {loading ? "Signing in..." : "Login"}
          </span>
        </button>

        <Link href="/signup" className="mt-4 flex w-full items-center justify-center rounded-xl border border-blue-400/70 bg-blue-500/[0.03] px-4 py-4 text-base font-semibold text-white transition hover:border-blue-300 hover:bg-blue-500/10">
          Create an account
        </Link>
      </form>
    </AuthShowcase>
  );
}
