"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getFallbackApiUrl, getMissingApiUrlMessage, getPrimaryApiUrl } from "@/lib/apiConfig";
import { getToken, getUser, setStoredUser } from "@/lib/auth";
import {
  getUserScopedStorageEventName,
  readUserScopedString,
  removeUserScopedValue,
  writeUserScopedString
} from "@/lib/userScopedStorage";

const AVATAR_KEY = "bsc_avatar";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ totalCourses: 0, completedCourses: 0 });
  const [enrollments, setEnrollments] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  useEffect(() => {
    const boot = async () => {
      try {
        const me = await apiFetch("/auth/me");
        setName(me.name || "");
        setEmail(me.email || "");
        setRole(me.role || "student");

        const dashboard = await apiFetch("/student/dashboard");
        setStats(dashboard?.stats || { totalCourses: 0, completedCourses: 0 });
      } catch {
        const user = getUser();
        if (user) {
          setName(user.name || "");
          setEmail(user.email || "");
          setRole(user.role || "student");
        }
        setError("Please login to view profile");
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, []);

  useEffect(() => {
    const syncAvatar = () => {
      const stored = readUserScopedString(AVATAR_KEY, "");
      setAvatarUrl(stored);
      setAvatarPreview(stored);
    };

    syncAvatar();
    window.addEventListener("storage", syncAvatar);
    window.addEventListener(getUserScopedStorageEventName(), syncAvatar);

    return () => {
      window.removeEventListener("storage", syncAvatar);
      window.removeEventListener(getUserScopedStorageEventName(), syncAvatar);
    };
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      setOrdersLoading(true);
      try {
        const data = await apiFetch("/enrollments/my");
        setEnrollments(Array.isArray(data) ? data : []);
      } catch {
        setEnrollments([]);
      } finally {
        setOrdersLoading(false);
      }
    };

    loadOrders();
  }, []);

  const updateInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    setMessage("");
    setError("");

    try {
      const result = await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name, email })
      });

      if (result?.user) {
        setStoredUser(result.user);
      }

      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSavingInfo(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setMessage("");
    setError("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      setSavingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match");
      setSavingPassword(false);
      return;
    }

    try {
      await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword })
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const downloadInvoice = async (enrollmentId) => {
    const token = getToken();
    if (!token) {
      setError("Please login first to download invoices.");
      return;
    }

    const baseUrl = getPrimaryApiUrl();
    const fallbackUrl = getFallbackApiUrl(baseUrl);

    if (!baseUrl) {
      setError(getMissingApiUrlMessage());
      return;
    }

    const tryDownload = async (url) => {
      const response = await fetch(`${url}/enrollments/${enrollmentId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Invoice download failed");
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `invoice-${enrollmentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    };

    try {
      await tryDownload(baseUrl);
    } catch {
      if (!fallbackUrl) {
        setError("Invoice service unavailable right now.");
        return;
      }

      try {
        await tryDownload(fallbackUrl);
      } catch {
        setError("Invoice service unavailable right now.");
      }
    }
  };

  const handleAvatarSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setAvatarPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const saveAvatar = () => {
    if (!avatarPreview) {
      setError("Please select an image first.");
      return;
    }
    writeUserScopedString(AVATAR_KEY, avatarPreview);
    setAvatarUrl(avatarPreview);
    setMessage("Avatar updated successfully.");
  };

  const removeAvatar = () => {
    removeUserScopedValue(AVATAR_KEY);
    setAvatarUrl("");
    setAvatarPreview("");
    setMessage("Avatar removed.");
  };

  if (loading) {
    return <main className="mx-auto w-[92%] max-w-6xl py-10">Loading profile...</main>;
  }

  return (
    <main className="mx-auto w-[92%] max-w-6xl py-10">
      <section className="mb-6 rounded-2xl border border-white/10 bg-card/70 p-6">
        <h1 className="font-display text-4xl">My Profile</h1>
        <p className="mt-2 text-slate-300">Manage your account details, password, and course activity.</p>
      </section>

      {message ? <div className="mb-4 rounded-xl border border-emerald-300/40 bg-emerald-500/10 p-4 text-emerald-100">{message}</div> : null}
      {error ? <div className="mb-4 rounded-xl border border-orange-300/40 bg-orange-500/10 p-4 text-orange-100">{error}</div> : null}

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-card/70 p-5">
          <p className="text-sm text-slate-300">Role</p>
          <p className="mt-1 text-xl font-semibold capitalize">{role}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/70 p-5">
          <p className="text-sm text-slate-300">Purchased Courses</p>
          <p className="mt-1 text-xl font-semibold">{stats.totalCourses}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/70 p-5">
          <p className="text-sm text-slate-300">Completed Courses</p>
          <p className="mt-1 text-xl font-semibold">{stats.completedCourses}</p>
        </div>
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-2">
        <form onSubmit={updateInfo} className="rounded-2xl border border-white/10 bg-card/70 p-6">
          <h2 className="mb-4 font-display text-2xl">Personal Information</h2>
          <label className="mb-3 block text-sm text-slate-300">Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mb-4 w-full rounded-xl border border-white/10 bg-bg px-3 py-2" />

          <label className="mb-3 block text-sm text-slate-300">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4 w-full rounded-xl border border-white/10 bg-bg px-3 py-2" />

          <button disabled={savingInfo} className="rounded-xl bg-accent px-4 py-2 font-semibold text-white disabled:opacity-70">
            {savingInfo ? "Saving..." : "Save Profile"}
          </button>
        </form>

        <form onSubmit={updatePassword} className="rounded-2xl border border-white/10 bg-card/70 p-6">
          <h2 className="mb-4 font-display text-2xl">Change Password</h2>

          <label className="mb-3 block text-sm text-slate-300">Current Password</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mb-4 w-full rounded-xl border border-white/10 bg-bg px-3 py-2" />

          <label className="mb-3 block text-sm text-slate-300">New Password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mb-4 w-full rounded-xl border border-white/10 bg-bg px-3 py-2" />

          <label className="mb-3 block text-sm text-slate-300">Confirm New Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mb-4 w-full rounded-xl border border-white/10 bg-bg px-3 py-2" />

          <button disabled={savingPassword} className="rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white disabled:opacity-70">
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>

      <section className="mb-6 rounded-2xl border border-white/10 bg-card/70 p-6">
        <h2 className="mb-4 font-display text-2xl">Profile Avatar</h2>
        <div className="flex flex-wrap items-center gap-5">
          <div className="h-24 w-24 overflow-hidden rounded-full border border-white/15 bg-[#0b1634]">
            {avatarPreview || avatarUrl ? (
              <img src={avatarPreview || avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl text-slate-400">{"\u{1F464}"}</div>
            )}
          </div>
          <div className="space-y-3">
            <input type="file" accept="image/*" onChange={handleAvatarSelect} className="text-sm text-slate-300" />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={saveAvatar} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">
                Save Avatar
              </button>
              <button type="button" onClick={removeAvatar} className="rounded-xl border border-white/20 px-4 py-2 text-sm">
                Remove
              </button>
            </div>
            <p className="text-xs text-slate-400">Max size 2MB. Stored locally in your browser.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-card/70 p-6">
        <h2 className="mb-4 font-display text-2xl">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-xl border border-white/20 px-4 py-2 text-sm">Open My Courses</Link>
          <Link href="/courses" className="rounded-xl border border-white/20 px-4 py-2 text-sm">Browse Courses</Link>
          <Link href="/wishlist" className="rounded-xl border border-white/20 px-4 py-2 text-sm">Open Wishlist</Link>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-card/70 p-6">
        <h2 className="mb-4 font-display text-2xl">My Orders & Invoices</h2>
        {ordersLoading ? (
          <p className="text-sm text-slate-300">Loading your purchase history...</p>
        ) : enrollments.length ? (
          <div className="overflow-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-orange-300">
                  <th className="py-2">Course</th>
                  <th>Instructor</th>
                  <th>Progress</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enroll) => (
                  <tr key={enroll._id} className="border-b border-white/10">
                    <td className="py-2">{enroll.course?.title}</td>
                    <td>{enroll.course?.instructor?.name || enroll.course?.instructor || "BadamClasses"}</td>
                    <td>{enroll.progress || 0}%</td>
                    <td>
                      <button
                        onClick={() => downloadInvoice(enroll._id)}
                        className="rounded-lg border border-orange-300/50 px-3 py-1 text-xs text-orange-200 hover:bg-orange-500/10"
                      >
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#0b1634]/70 p-4 text-sm text-slate-300">
            No purchases found yet. Enroll in a batch to see invoices here.
          </div>
        )}
      </section>
    </main>
  );
}

