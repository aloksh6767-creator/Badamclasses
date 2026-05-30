"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Features", href: "/ai-saas#features" },
  { label: "Dashboards", href: "/ai-saas#dashboards" },
  { label: "Pricing", href: "/ai-saas#pricing" },
  { label: "Admin", href: "/ai-saas#admin" }
];

export default function SaasNav() {
  const pathname = usePathname() || "";
  const isDashboard = pathname.startsWith("/ai-saas/dashboard");

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080b12]/88 backdrop-blur-xl">
      <div className="mx-auto flex w-[92%] max-w-7xl items-center justify-between gap-4 py-4">
        <Link href="/ai-saas" className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-teal-300/30 bg-teal-300/10 text-sm font-black text-teal-100">
            AL
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate font-display text-base font-semibold text-white">AstraLearn AI</span>
            <span className="block truncate text-xs text-slate-400">Intelligent learning OS</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 text-sm md:flex">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="rounded-lg px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isDashboard ? (
            <Link href="/ai-saas" className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/60">
              Site
            </Link>
          ) : (
            <Link href="/ai-saas/login" className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/60">
              Login
            </Link>
          )}
          <Link href="/ai-saas/dashboard" className="rounded-lg bg-teal-300 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-teal-200">
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
