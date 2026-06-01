"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getUser, isAdminUser, logout } from "@/lib/auth";
import { getUserScopedStorageEventName, readUserScopedString } from "@/lib/userScopedStorage";

const menuItems = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Mock Tests", href: "/mock-tests" },
  { label: "Current Affairs", href: "/current-affairs" },
  { label: "Results", href: "/results" },
  { label: "Contact", href: "/contact" }
];

const AVATAR_KEY = "bsc_avatar";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState("");
  const profileRef = useRef(null);

  useEffect(() => {
    const syncNavbarState = () => {
      const saved = typeof window !== "undefined" ? localStorage.getItem("bsc_theme") : null;
      const initial = saved || "dark";
      setTheme(initial);
      document.documentElement.classList.toggle("theme-light", initial === "light");
      setUser(getUser());
      setAvatar(readUserScopedString(AVATAR_KEY, ""));
    };

    syncNavbarState();

    window.addEventListener("storage", syncNavbarState);
    window.addEventListener(getUserScopedStorageEventName(), syncNavbarState);
    return () => {
      window.removeEventListener("storage", syncNavbarState);
      window.removeEventListener(getUserScopedStorageEventName(), syncNavbarState);
    };
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const profileLabel = useMemo(() => {
    if (!user?.name) return "Profile";
    return user.name.split(" ")[0];
  }, [user]);

  const isAdmin = isAdminUser(user);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("theme-light", next === "light");
    localStorage.setItem("bsc_theme", next);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setProfileOpen(false);
    window.location.href = "/";
  };

  return (
    <header className="animate-nav sticky top-0 z-40 border-b border-white/10 bg-[#07122a]/85 backdrop-blur-xl">
      <div className="mx-auto flex w-[94%] max-w-7xl items-center justify-between gap-4 py-3">
        <Link href="/" className="logo-light-wrap flex items-center gap-3">
          <span className="logo-border-track" />
          <span className="logo-light-orbit">
            <span className="logo-light-dot" />
          </span>
          <img
            src="/new-logo.png"
            alt="Badam Singh Classes Logo"
            className="relative z-10 h-14 w-auto max-w-[260px] rounded-md border border-white/15 object-contain"
          />
        </Link>

        <nav className="hidden flex-1 flex-wrap items-center justify-center gap-3 text-sm lg:flex xl:gap-4">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="nav-trail group relative overflow-hidden rounded-full border border-indigo-300/20 bg-white/5 px-4 py-2 font-medium text-slate-200 transition duration-200 hover:-translate-y-0.5 hover:border-orange-300/60 hover:text-white hover:shadow-[0_0_22px_rgba(251,146,60,0.4)]"
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-400/0 via-orange-300/10 to-cyan-300/0 opacity-0 transition duration-200 group-hover:opacity-100" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <button onClick={toggleTheme} className="btn-anim rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-slate-100">
            {theme === "dark" ? "Light" : "Dark"}
          </button>

          <Link
            href="/dashboard"
            className="btn-light-wrap btn-anim relative overflow-hidden rounded-lg border border-orange-300/50 bg-orange-500/15 px-3 py-2 text-xs font-semibold text-orange-100 transition hover:bg-orange-500/25"
          >
            <span className="btn-light-sweep" />
            <span className="relative z-10">My Courses</span>
          </Link>

          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="btn-light-wrap btn-anim relative flex items-center gap-2 overflow-hidden rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100"
              >
                <span className="btn-light-sweep" />
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="relative z-10 h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="relative z-10">{"\u{1F464}"}</span>
                )}
                <span className="relative z-10">{profileLabel}</span>
              </button>

              {profileOpen ? (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/15 bg-[#081633]/95 p-2 shadow-2xl">
                  <div className="mb-2 border-b border-white/10 px-2 pb-2">
                    <p className="text-xs font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-slate-300">{user.email}</p>
                  </div>
                  <Link href="/profile" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-white/10">My Profile</Link>
                  <Link href="/dashboard" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-white/10">My Courses</Link>
                  <Link href="/wishlist" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-white/10">Wishlist</Link>
                  {isAdmin ? (
                    <>
                      <Link href="/admin" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-xs text-orange-200 hover:bg-orange-500/20">
                        Admin Panel
                      </Link>
                      <Link href="/admin#new-course" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/20">
                        Upload Course
                      </Link>
                      <Link href="/admin#manage-courses" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/20">
                        Manage Courses
                      </Link>
                    </>
                  ) : null}
                  <button onClick={handleLogout} className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-xs text-rose-200 hover:bg-rose-500/20">Logout</button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="btn-light-wrap btn-anim relative overflow-hidden rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold text-white transition hover:border-orange-300"
              >
                <span className="btn-light-sweep" />
                <span className="relative z-10">Login</span>
              </Link>
              <Link
                href="/signup"
                className="btn-light-wrap btn-anim relative overflow-hidden rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-400"
              >
                <span className="btn-light-sweep" />
                <span className="relative z-10">Register</span>
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation-drawer"
          className="btn-anim inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-slate-100 lg:hidden"
        >
          <span className="sr-only">{mobileOpen ? "Close navigation" : "Open navigation"}</span>
          <span className="flex w-4 flex-col gap-1">
            <span className={`h-0.5 rounded-full bg-current transition ${mobileOpen ? "translate-y-1.5 rotate-45" : ""}`} />
            <span className={`h-0.5 rounded-full bg-current transition ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`h-0.5 rounded-full bg-current transition ${mobileOpen ? "-translate-y-1.5 -rotate-45" : ""}`} />
          </span>
        </button>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
          />
          <div
            id="mobile-navigation-drawer"
            className="absolute right-3 top-3 flex max-h-[calc(100vh-1.5rem)] w-[min(19rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#081633]/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-200">Menu</p>
                <p className="truncate text-sm font-semibold text-white">{user?.name || "BadamClasses"}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-lg leading-none text-white"
                aria-label="Close navigation"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto px-3 py-3">
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button onClick={toggleTheme} className="btn-anim rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100">
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="btn-anim rounded-xl border border-orange-300/40 bg-orange-500/15 px-3 py-2 text-center text-xs font-semibold text-orange-100">
                  My Courses
                </Link>
                {user ? (
                  <button onClick={handleLogout} className="btn-anim rounded-xl border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100">Logout</button>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileOpen(false)} className="btn-anim rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-center text-xs font-semibold text-white">Login</Link>
                    <Link href="/signup" onClick={() => setMobileOpen(false)} className="btn-anim rounded-xl bg-orange-500 px-3 py-2 text-center text-xs font-semibold text-white">Register</Link>
                  </>
                )}
                {user && isAdmin ? (
                  <>
                    <Link href="/admin" onClick={() => setMobileOpen(false)} className="btn-anim rounded-xl border border-orange-300/40 bg-orange-500/15 px-3 py-2 text-center text-xs font-semibold text-orange-100">
                      Admin
                    </Link>
                    <Link href="/admin#manage-courses" onClick={() => setMobileOpen(false)} className="btn-anim rounded-xl border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-center text-xs font-semibold text-rose-100">
                      Manage
                    </Link>
                  </>
                ) : null}
              </div>

              <nav className="grid gap-1.5">
                {menuItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-slate-100 transition hover:border-orange-300/50 hover:bg-orange-500/10"
                  >
                    <span>{item.label}</span>
                    <span className="text-slate-500">&rsaquo;</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

