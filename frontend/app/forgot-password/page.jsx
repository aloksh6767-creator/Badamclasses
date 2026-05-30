"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [devCode, setDevCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setRequesting(true);
    setError("");
    setNotice("");

    try {
      const payload = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      setOtpSent(true);
      setMaskedPhone(payload?.maskedPhone || "");
      setDevCode(payload?.devCode || "");
      setNotice(payload?.message || "OTP sent to your registered phone number.");
    } catch (err) {
      setError(String(err.message || "").trim() || "Unable to send OTP right now.");
    } finally {
      setRequesting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetting(true);
    setError("");
    setNotice("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (newPassword !== confirmPassword) {
        throw new Error("New password and confirm password do not match.");
      }

      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          otpCode: otpCode.trim(),
          newPassword
        })
      });

      window.location.href = `/login?email=${encodeURIComponent(normalizedEmail)}&reset=1`;
    } catch (err) {
      setError(String(err.message || "").trim() || "Unable to reset password right now.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-[70vh] w-[92%] max-w-md place-items-center py-10">
      <div className="w-full rounded-2xl border border-white/10 bg-card/70 p-6 backdrop-blur">
        <h1 className="mb-2 font-display text-3xl">Forgot Password</h1>
        <p className="mb-4 text-sm text-white/70">Enter your registered email. We will send an OTP to your linked phone number.</p>
        {error ? (
          <div className="mb-3 rounded-xl border border-orange-300/40 bg-orange-500/10 p-3 text-sm text-orange-100">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mb-3 rounded-xl border border-emerald-300/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {notice}
            {maskedPhone ? ` (${maskedPhone})` : ""}
          </div>
        ) : null}
        <form onSubmit={handleRequestOtp}>
          <input
            type="email"
            required
            placeholder="Registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-3 w-full rounded-lg bg-bg px-3 py-2"
          />
          <button disabled={requesting} className="mb-4 w-full rounded-xl bg-accent px-4 py-2 font-semibold disabled:opacity-70">
            {requesting ? "Sending OTP..." : otpSent ? "Resend OTP" : "Send OTP"}
          </button>
        </form>

        {otpSent ? (
          <form onSubmit={handleResetPassword}>
            <input
              type="text"
              required
              placeholder="Enter OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="mb-3 w-full rounded-lg bg-bg px-3 py-2"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mb-3 w-full rounded-lg bg-bg px-3 py-2"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mb-3 w-full rounded-lg bg-bg px-3 py-2"
            />
            {devCode ? <p className="mb-3 text-xs text-orange-100">Dev OTP: {devCode}</p> : null}
            <button disabled={resetting} className="w-full rounded-xl bg-accent px-4 py-2 font-semibold disabled:opacity-70">
              {resetting ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        ) : null}

        <div className="mt-4 text-center text-sm text-white/70">
          <Link href={`/login${email ? `?email=${encodeURIComponent(email.trim())}` : ""}`} className="text-orange-100 transition hover:text-white">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
