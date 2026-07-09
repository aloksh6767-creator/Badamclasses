"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getDefaultRouteForUser, getSafeRedirectPath, getToken, getUser, saveAuth } from "@/lib/auth";
import AuthShowcase from "@/components/AuthShowcase";

function FieldIcon({ type }) {
  const paths = {
    name: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm7 9a7 7 0 0 0-14 0",
    mail: "M4 6h16v12H4V6Zm0 0 8 7 8-7",
    lock: "M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Zm4 4v2",
    phone: "M6.5 4h3l1.5 4-2 1.2a10 10 0 0 0 5.8 5.8l1.2-2 4 1.5v3A2.5 2.5 0 0 1 17.2 20 13.2 13.2 0 0 1 4 6.8 2.5 2.5 0 0 1 6.5 4Z",
    otp: "M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Zm-2 9 1.5 1.5L15 10"
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d={paths[type]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SignupPage() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpMode, setOtpMode] = useState("server");
  const [devCode, setDevCode] = useState("");
  const DEMO_OTP_KEY = "bsc_demo_otp_";
  const LOCAL_SIGNUP_USERS_KEY = "bsc_local_signup_users";
  const redirectTarget = getSafeRedirectPath(searchParams.get("redirect"), "");

  const normalizedPhone = phone.replace(/\s+/g, "");
  const normalizedEmail = email.trim().toLowerCase();
  const canSubmit = useMemo(() => {
    return name && normalizedEmail && password && normalizedPhone && otp && otpVerified && !loading;
  }, [name, normalizedEmail, password, normalizedPhone, otp, otpVerified, loading]);

  useEffect(() => {
    const existingUser = getUser();
    if (existingUser && getToken()) {
      window.location.href = redirectTarget || getDefaultRouteForUser(existingUser);
    }
  }, [redirectTarget]);

  const sendOtp = async () => {
    setError("");
    setNotice("");
    setDevCode("");
    if (!normalizedPhone) {
      setError("Phone number is required.");
      return;
    }
    setSendingOtp(true);
    try {
      const data = await apiFetch("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: normalizedPhone })
      });
      setOtpSent(true);
      setOtpVerified(false);
      setOtpMode("server");
      setNotice("OTP sent to your phone.");
      if (data?.devCode) {
        setDevCode(data.devCode);
      }
    } catch (err) {
      const fallbackCode = String(Math.floor(100000 + Math.random() * 900000));
      const payload = { code: fallbackCode, expiresAt: Date.now() + 10 * 60 * 1000 };
      localStorage.setItem(`${DEMO_OTP_KEY}${normalizedPhone}`, JSON.stringify(payload));
      setOtpSent(true);
      setOtpVerified(false);
      setOtpMode("demo");
      setDevCode(fallbackCode);
      setNotice("Backend unavailable. Demo OTP generated. Please resend once the server is reachable to create the account.");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    setNotice("");
    if (!normalizedPhone || !otp) {
      setError("Phone and OTP are required.");
      return;
    }
    setVerifyingOtp(true);
    try {
      await apiFetch("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone: normalizedPhone, code: otp })
      });
      setOtpVerified(true);
      setOtpMode("server");
      setNotice("Phone verified successfully.");
    } catch (err) {
      const cached = localStorage.getItem(`${DEMO_OTP_KEY}${normalizedPhone}`);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() <= data.expiresAt && String(data.code) === String(otp).trim()) {
          setOtpVerified(true);
          setOtpMode("demo");
          setNotice("Phone verified (demo mode).");
        } else {
          setError("OTP expired or incorrect.");
          setOtpVerified(false);
        }
      } else {
        setError(err.message || "OTP verification failed.");
        setOtpVerified(false);
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!name || !email || !password || !normalizedPhone || !otp) {
      setError("All fields are required.");
      return;
    }
    if (!otpVerified) {
      setError("Please verify OTP before creating account.");
      return;
    }
    if (otpMode === "demo") {
      const localUser = {
        id: `local-${Date.now()}`,
        name: name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        role: role === "admin" ? "admin" : "student",
        phoneVerified: true,
        localOnly: true,
        createdAt: new Date().toISOString()
      };
      const existingUsers = JSON.parse(localStorage.getItem(LOCAL_SIGNUP_USERS_KEY) || "[]");
      const alreadyExists = existingUsers.some((user) => user.email === normalizedEmail || user.phone === normalizedPhone);
      if (alreadyExists) {
        setError("This email or phone is already registered locally. Please login or use another number.");
        return;
      }
      localStorage.setItem(LOCAL_SIGNUP_USERS_KEY, JSON.stringify([localUser, ...existingUsers]));
      saveAuth(`local-demo-${Date.now()}`, localUser);
      localStorage.removeItem(`${DEMO_OTP_KEY}${normalizedPhone}`);
      window.location.href = redirectTarget || getDefaultRouteForUser(localUser);
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: normalizedEmail, password, role, phone: normalizedPhone, otpCode: otp })
      });
      if (data?.user?.email) {
        setNotice("Account created successfully. Please login to continue.");
      }
      const loginRedirect = new URLSearchParams({
        registered: "1",
        email: normalizedEmail
      });
      if (redirectTarget) {
        loginRedirect.set("redirect", redirectTarget);
      }
      window.location.href = `/login?${loginRedirect.toString()}`;
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShowcase mode="signup">
      <form onSubmit={handleSubmit} className="auth-form-stack mx-auto w-full max-w-[30rem]">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-orange-300/30 bg-white/10 shadow-[0_0_32px_rgba(251,146,60,0.22)] lg:hidden">
            <img src="/new-logo.png" alt="Badam Singh Classes" className="h-full w-full object-cover" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-orange-300">Badam Singh Classes</p>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Create Account</h1>
          <p className="mt-3 text-sm text-slate-300">Register for batches, tests, and dashboard access</p>
          <div className="mx-auto mt-6 h-0.5 w-16 rounded-full bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.75)]" />
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
        {devCode ? (
          <div className="mb-4 rounded-xl border border-indigo-300/40 bg-indigo-500/10 p-3 text-xs text-indigo-100">
            Dev OTP: <span className="font-semibold">{devCode}</span>
          </div>
        ) : null}

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-semibold text-white">Full Name</span>
          <span className="flex items-center gap-3 rounded-xl border border-white/20 bg-[#071a3c]/70 px-4 py-3 text-slate-300 transition focus-within:border-orange-300/70 focus-within:bg-[#082051]">
            <FieldIcon type="name" />
            <input required placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400 sm:text-base" />
          </span>
        </label>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-semibold text-white">Email</span>
          <span className="flex items-center gap-3 rounded-xl border border-white/20 bg-[#071a3c]/70 px-4 py-3 text-slate-300 transition focus-within:border-orange-300/70 focus-within:bg-[#082051]">
            <FieldIcon type="mail" />
            <input type="email" required placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400 sm:text-base" />
          </span>
        </label>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-semibold text-white">Password</span>
          <span className="flex items-center gap-3 rounded-xl border border-white/20 bg-[#071a3c]/70 px-4 py-3 text-slate-300 transition focus-within:border-orange-300/70 focus-within:bg-[#082051]">
            <FieldIcon type="lock" />
            <input type="password" required placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400 sm:text-base" />
          </span>
        </label>

        <div className="mb-4">
          <span className="mb-2 block text-sm font-semibold text-white">Mobile Number</span>
          <div className="flex gap-2">
            <span className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/20 bg-[#071a3c]/70 px-4 py-3 text-slate-300 transition focus-within:border-orange-300/70 focus-within:bg-[#082051]">
              <FieldIcon type="phone" />
              <input
                type="tel"
                required
                placeholder="Phone (e.g. 919999999999)"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setOtpVerified(false);
                  setOtpMode("server");
                }}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400 sm:text-base"
              />
            </span>
          <button
            type="button"
            onClick={sendOtp}
            disabled={sendingOtp}
              className="shrink-0 rounded-xl border border-orange-300/40 bg-orange-500/15 px-3 text-xs font-semibold text-orange-100 transition hover:bg-orange-500/25 disabled:opacity-60"
          >
            {sendingOtp ? "Sending" : otpSent ? "Resend" : "Send OTP"}
          </button>
          </div>
        </div>

        <div className="mb-4">
          <span className="mb-2 block text-sm font-semibold text-white">OTP Verification</span>
          <div className="flex gap-2">
            <span className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/20 bg-[#071a3c]/70 px-4 py-3 text-slate-300 transition focus-within:border-orange-300/70 focus-within:bg-[#082051]">
              <FieldIcon type="otp" />
              <input
                type="text"
                required
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400 sm:text-base"
              />
            </span>
          <button
            type="button"
            onClick={verifyOtp}
            disabled={verifyingOtp}
              className="shrink-0 rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-60"
          >
            {verifyingOtp ? "Verifying" : otpVerified ? "Verified" : "Verify"}
          </button>
          </div>
        </div>

        <label className="mb-6 block">
          <span className="mb-2 block text-sm font-semibold text-white">Account Type</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-xl border border-white/20 bg-[#071a3c]/70 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300/70 sm:text-base">
          <option value="student">Student</option>
          <option value="admin">Admin / Instructor</option>
        </select>
        </label>

        <button disabled={!canSubmit} className="auth-submit-btn btn-light-wrap relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-4 text-base font-bold text-white shadow-[0_18px_36px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:opacity-70">
          <span className="btn-light-sweep" />
          <span className="relative z-10">
          {loading ? "Creating..." : "Create Account"}
          </span>
        </button>

        <p className="mt-6 text-center text-sm text-slate-300">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-orange-300 transition hover:text-orange-100">
            Login
          </Link>
        </p>
      </form>
    </AuthShowcase>
  );
}
