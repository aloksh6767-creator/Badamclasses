"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import SaasNav from "@/components/ai-saas/SaasNav";
import { getFirebaseAuthClient, getFirebaseClientStatus } from "@/lib/firebaseClient";

const aiModes = {
  doubt: {
    label: "Doubt",
    title: "AI Doubt Solver",
    placeholder: "Explain time and work questions with a shortcut method",
    result: "Start from total work as LCM, convert each worker to per-day efficiency, then compare combined efficiency with the required deadline. Add a quick sanity check before final answer."
  },
  planner: {
    label: "Planner",
    title: "AI Study Planner",
    placeholder: "I have 45 days for SSC CGL and weak maths",
    result: "Plan: 2 maths drills daily, one reasoning sectional test every alternate day, current affairs revision at night, and a full mock every Sunday with error-log review."
  },
  notes: {
    label: "Notes",
    title: "AI Notes Summarizer",
    placeholder: "Summarize profit and loss class notes",
    result: "Summary: learn marked price, discount, cost price, selling price, successive discount, and dishonest dealer cases. Revise formula mapping before solving mixed examples."
  }
};

const metrics = [
  { label: "Progress", value: "82%", tone: "text-teal-100" },
  { label: "Study streak", value: "21 days", tone: "text-amber-100" },
  { label: "Mock score", value: "148/200", tone: "text-sky-100" },
  { label: "Leaderboard", value: "#18", tone: "text-rose-100" }
];

const courses = [
  { title: "SSC CGL Complete Batch", progress: 82, meta: "Live today at 7:00 PM", tag: "Continue watching" },
  { title: "Railway NTPC Reasoning", progress: 64, meta: "12 bookmarked videos", tag: "Recorded" },
  { title: "Banking Quant Sprint", progress: 48, meta: "Mock test due tomorrow", tag: "Daily goal" }
];

const activity = [
  "Completed algebra weak-topic drill",
  "Downloaded current affairs PDF notes",
  "Scored 86% in reasoning mini mock",
  "Earned Consistency badge"
];

const adminQueue = [
  { label: "Pending support chats", value: "14" },
  { label: "Revenue this month", value: "$84k" },
  { label: "Live classes scheduled", value: "32" },
  { label: "Payment failures", value: "3" }
];

export default function SaasDashboard() {
  const router = useRouter();
  const firebaseStatus = useMemo(() => getFirebaseClientStatus(), []);
  const [authState, setAuthState] = useState("checking");
  const [user, setUser] = useState(null);
  const [activeTool, setActiveTool] = useState("doubt");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    const auth = getFirebaseAuthClient();
    if (!auth) {
      setAuthState("missing-config");
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/ai-saas/login?redirect=/ai-saas/dashboard");
        return;
      }

      setUser(currentUser);
      setAuthState("ready");
    });

    return unsubscribe;
  }, [router]);

  const selectedTool = aiModes[activeTool];

  const handleGenerate = () => {
    setGenerating(true);
    setResult("");
    window.setTimeout(() => {
      setResult(selectedTool.result);
      setGenerating(false);
    }, 700);
  };

  const handleLogout = async () => {
    const auth = getFirebaseAuthClient();
    if (auth) {
      await signOut(auth);
    }
    router.replace("/ai-saas/login");
  };

  if (authState === "missing-config") {
    return (
      <main className="min-h-screen bg-[#070a12] text-slate-100">
        <SaasNav />
        <section className="mx-auto grid min-h-[calc(100vh-73px)] w-[92%] max-w-3xl place-items-center py-12 text-center">
          <div className="rounded-[8px] border border-amber-300/35 bg-amber-300/10 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-100">Setup required</p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-white">Firebase auth is not configured.</h1>
            <p className="mt-3 text-sm leading-6 text-amber-50">
              Add these public keys to `frontend/.env.local` and restart the dev server: {firebaseStatus.missingKeys.join(", ")}.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (authState !== "ready") {
    return (
      <main className="min-h-screen bg-[#070a12] text-slate-100">
        <SaasNav />
        <section className="grid min-h-[calc(100vh-73px)] place-items-center">
          <p className="rounded-[8px] border border-white/10 bg-white/[0.045] px-5 py-3 text-sm text-slate-300">Checking Firebase session...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070a12] text-slate-100">
      <SaasNav />
      <section className="mx-auto w-[92%] max-w-7xl py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-200">Learning dashboard</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-white">
              Welcome{user?.displayName ? `, ${user.displayName}` : ""}.
            </h1>
            <p className="mt-2 text-sm text-slate-400">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-rose-300/60">
            Logout
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-[8px] border border-white/10 bg-white/[0.045] p-5">
              <p className="text-sm text-slate-400">{metric.label}</p>
              <p className={`mt-2 font-display text-3xl font-semibold ${metric.tone}`}>{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[8px] border border-white/10 bg-slate-950/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-200">AI learning assistant</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{selectedTool.title}</h2>
              </div>
              <span className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100">
                Mock AI mode
              </span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {Object.entries(aiModes).map(([key, tool]) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTool(key);
                    setResult("");
                  }}
                  className={`rounded-[8px] border px-4 py-3 text-left transition ${activeTool === key ? "border-teal-300/50 bg-teal-300/10 text-white" : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20"}`}
                >
                  <span className="block text-sm font-semibold">{tool.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">AI workflow</span>
                </button>
              ))}
            </div>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Prompt</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={5}
                className="w-full resize-none rounded-[8px] border border-white/10 bg-[#080b12] px-4 py-3 text-white outline-none transition focus:border-teal-300/70"
                placeholder={selectedTool.placeholder}
              />
            </label>

            <button onClick={handleGenerate} disabled={generating} className="mt-4 rounded-xl bg-teal-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-teal-200 disabled:cursor-wait disabled:opacity-60">
              {generating ? "Generating..." : "Generate recommendation"}
            </button>

            <div className="mt-6 min-h-[145px] rounded-[8px] border border-white/10 bg-white/[0.035] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Result</p>
              <p className="mt-4 text-base leading-7 text-slate-200">
                {result || "AI recommendations, notes, and doubt answers will appear here once a model endpoint is connected."}
              </p>
            </div>
          </section>

          <section className="rounded-[8px] border border-white/10 bg-slate-950/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-200">Course queue</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Continue learning</h2>
              </div>
              <span className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">3 active courses</span>
            </div>

            <div className="mt-5 space-y-3">
              {courses.map((course) => (
                <article key={course.title} className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{course.title}</h3>
                      <p className="mt-1 text-sm text-slate-400">{course.meta}</p>
                    </div>
                    <span className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200">{course.tag}</span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-teal-300 to-amber-200" style={{ width: `${course.progress}%` }} />
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">Recent activity</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-400">
                  {activity.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-teal-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">Admin snapshot</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {adminQueue.map((item) => (
                    <div key={item.label} className="rounded-lg bg-slate-900/80 p-3">
                      <p className="text-lg font-semibold text-white">{item.value}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
