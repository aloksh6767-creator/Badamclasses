import Link from "next/link";
import SaasNav from "@/components/ai-saas/SaasNav";

const featureGroups = [
  {
    title: "AI Learning Layer",
    items: ["Doubt-solving chatbot", "Study planner", "Notes summarizer", "AI recommendations", "Weak-topic diagnosis", "Daily goals"]
  },
  {
    title: "Student Experience",
    items: ["Progress tracking", "Live classes", "Mock tests", "PDF notes viewer", "Course wishlist", "Continue watching"]
  },
  {
    title: "Engagement Engine",
    items: ["Leaderboards", "Gamification badges", "Study streaks", "Video bookmarks", "Push notifications", "WhatsApp nudges"]
  },
  {
    title: "Admin Control",
    items: ["Course uploads", "Live scheduling", "Student management", "Analytics", "Revenue tracking", "Notifications"]
  }
];

const dashboardStats = [
  { label: "Completion", value: "82%", tone: "text-teal-100" },
  { label: "Streak", value: "21d", tone: "text-amber-100" },
  { label: "Tests", value: "46", tone: "text-sky-100" },
  { label: "Rank", value: "#18", tone: "text-rose-100" }
];

const studentPanels = [
  { title: "Performance Analytics", value: "+24%", text: "Reasoning accuracy improved after AI topic drills." },
  { title: "Weak Subject Analysis", value: "Maths", text: "Algebra, ratio, and time-work are marked for revision." },
  { title: "Recent Activity", value: "8 tasks", text: "Classes, notes, bookmarks, and mocks synced in one feed." }
];

const adminModules = [
  "Manage students",
  "Upload courses",
  "Schedule live classes",
  "Test management",
  "Revenue tracking",
  "Support notifications"
];

const pricing = [
  { name: "Starter", price: "$29", text: "For new academies launching online batches.", features: ["500 students", "AI chatbot", "Mock tests"] },
  { name: "Growth", price: "$99", text: "For serious coaching teams scaling paid courses.", features: ["5,000 students", "Admin analytics", "Payments"], featured: true },
  { name: "Enterprise", price: "Custom", text: "For multi-branch institutes and large learning brands.", features: ["SLA support", "Custom domains", "Integrations"] }
];

function SectionHeader({ eyebrow, title, text }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-200">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-300">{text}</p>
    </div>
  );
}

export default function SaasMarketing() {
  return (
    <main className="min-h-screen bg-[#070a12] text-slate-100">
      <SaasNav />

      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-28"
          style={{
            backgroundImage:
              "linear-gradient(90deg,rgba(7,10,18,0.98),rgba(7,10,18,0.76),rgba(7,10,18,0.96)),url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1800&q=85')"
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-73px)] w-[92%] max-w-7xl items-center gap-10 py-16 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-lg border border-teal-300/30 bg-teal-300/10 px-3 py-2 text-sm font-semibold text-teal-100">
              AI-powered learning platform for modern academies
            </div>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              AstraLearn AI
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              A polished learning OS with AI doubt solving, student analytics, mock tests, live classes, admin controls, and payments built into one fast product surface.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/ai-saas/login" className="rounded-xl bg-teal-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-teal-200">
                Launch workspace
              </Link>
              <Link href="#dashboards" className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-amber-300/60">
                View dashboards
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[8px] border border-white/12 bg-slate-950/82 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-sm font-semibold text-white">Student Command Center</p>
                <p className="text-xs text-slate-400">SSC 2026 preparation plan</p>
              </div>
              <span className="rounded-lg bg-emerald-300/12 px-3 py-1 text-xs font-semibold text-emerald-100">Live</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {dashboardStats.map((item) => (
                <div key={item.label} className="rounded-[8px] border border-white/10 bg-white/[0.045] p-4">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className={`mt-2 font-display text-2xl font-semibold ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_0.82fr]">
              <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">AI study planner</p>
                    <p className="mt-1 text-sm text-slate-400">Today: 2 live classes, 1 mock, 4 weak-topic drills.</p>
                  </div>
                  <span className="rounded-lg bg-teal-300 px-3 py-2 text-sm font-bold text-slate-950">AI</span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-teal-300 to-amber-200" />
                </div>
              </div>
              <div className="rounded-[8px] border border-amber-300/25 bg-amber-300/10 p-4">
                <p className="text-sm font-semibold text-white">Next action</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Continue watching Quant Basics from 18:42 and bookmark the profit-loss recap.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-[92%] max-w-7xl py-20">
        <SectionHeader eyebrow="Advanced Features" title="Everything from learning to retention" text="The product surface covers AI assistance, course engagement, analytics, notifications, and operational controls without changing the existing website checkout." />
        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureGroups.map((group) => (
            <article key={group.title} className="rounded-[8px] border border-white/10 bg-white/[0.045] p-6">
              <h3 className="text-xl font-semibold text-white">{group.title}</h3>
              <ul className="mt-5 space-y-3 text-sm text-slate-300">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-teal-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="dashboards" className="border-y border-white/10 bg-[#0b1018] py-20">
        <div className="mx-auto w-[92%] max-w-7xl">
          <SectionHeader eyebrow="Student Dashboard" title="A daily cockpit for serious learners" text="Progress charts, course queues, performance analytics, weak-topic recommendations, daily goals, streaks, and recent activity are all visible in one place." />
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {studentPanels.map((panel) => (
              <article key={panel.title} className="rounded-[8px] border border-white/10 bg-slate-950/70 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{panel.title}</p>
                <h3 className="mt-4 font-display text-4xl font-semibold text-white">{panel.value}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{panel.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="admin" className="mx-auto grid w-[92%] max-w-7xl gap-10 py-20 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-200">Admin Panel</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">Run the entire academy from one back office.</h2>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Upload courses, schedule classes, manage students, review payments, publish updates, and keep support loops visible for every team member.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {adminModules.map((module) => (
            <div key={module} className="rounded-[8px] border border-white/10 bg-white/[0.045] p-5">
              <p className="text-sm font-semibold text-white">{module}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Production-ready surface with clear empty, loading, and action states.</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-t border-white/10 bg-[#0b1018] py-20">
        <div className="mx-auto w-[92%] max-w-7xl">
          <SectionHeader eyebrow="Payments" title="Plans built around course revenue" text="Subscription tiers, coupons, Razorpay-ready checkout positioning, and explicit payment states for a serious commercial product." />
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {pricing.map((plan) => (
              <article key={plan.name} className={`rounded-[8px] border p-6 ${plan.featured ? "border-teal-300/45 bg-teal-300/10" : "border-white/10 bg-white/[0.045]"}`}>
                <p className="text-lg font-semibold text-white">{plan.name}</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="font-display text-4xl font-semibold text-white">{plan.price}</span>
                  {plan.price !== "Custom" ? <span className="pb-1 text-sm text-slate-400">/mo</span> : null}
                </div>
                <p className="mt-4 min-h-[48px] text-sm leading-6 text-slate-400">{plan.text}</p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {plan.features.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-emerald-200">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/ai-saas/login" className={`mt-7 block rounded-xl px-4 py-3 text-center text-sm font-bold ${plan.featured ? "bg-teal-300 text-slate-950" : "border border-white/15 text-white"}`}>
                  Choose {plan.name}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
