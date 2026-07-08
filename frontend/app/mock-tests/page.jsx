"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readAdminWorkspace } from "@/lib/adminWorkspace";
import { apiFetch } from "@/lib/api";
import {
  mockExamCategories,
  mockInterfaceActions,
  resultAnalysisList,
  rojgarWithAnkitFreeMocks,
  sscCglAdvancedMocks,
  timerFeatureList
} from "@/lib/mockTestCatalog";

const fallbackOnlineMocks = [
  ...sscCglAdvancedMocks,
  ...rojgarWithAnkitFreeMocks,
  {
    id: "fallback-ssc-cgl-1",
    title: "SSC CGL Full Mock 1",
    examName: "SSC CGL",
    questions: 100,
    marks: 200,
    duration: "60 min",
    sectionTiming: "Single timer",
    negativeMarking: "0.50 mark",
    language: "Hindi + English",
    examMode: "Full Test",
    accessType: "Free",
    difficulty: "Medium",
    resultVisibility: "Instant",
    testUrl: "",
    status: "published"
  }
];

const mergePublishedMocks = (workspaceMocks = []) => {
  const publishedWorkspaceMocks = Array.isArray(workspaceMocks)
    ? workspaceMocks.filter((item) => item?.status === "published")
    : [];
  const byId = new Map();

  [...sscCglAdvancedMocks, ...rojgarWithAnkitFreeMocks, ...publishedWorkspaceMocks].forEach((item) => {
    const key = item?.id || item?.title;
    if (key && !byId.has(key)) {
      byId.set(key, item);
    }
  });

  return byId.size ? Array.from(byId.values()) : fallbackOnlineMocks;
};

export default function MockTestsPage() {
  const [mockTests, setMockTests] = useState(fallbackOnlineMocks);
  const [mcqSets, setMcqSets] = useState([]);

  useEffect(() => {
    const workspace = readAdminWorkspace();
    setMockTests(mergePublishedMocks(workspace.mockTests));
  }, []);

  useEffect(() => {
    let active = true;

    const loadMcqSets = async () => {
      try {
        const data = await apiFetch("/automation/public-mcqs?limit=8");
        if (active) {
          setMcqSets(Array.isArray(data?.mcqSets) ? data.mcqSets : []);
        }
      } catch {
        if (active) {
          setMcqSets([]);
        }
      }
    };

    loadMcqSets();
    return () => {
      active = false;
    };
  }, []);

  const publishedCount = useMemo(() => mockTests.length, [mockTests]);
  const mcqCount = useMemo(
    () => mcqSets.reduce((total, item) => total + (Array.isArray(item.questions) ? item.questions.length : 0), 0),
    [mcqSets]
  );

  return (
    <main className="mx-auto w-[92%] max-w-6xl py-10 text-slate-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Real Exam Practice</p>
          <h1 className="mt-2 font-display text-4xl">Free & Paid Mock Tests</h1>
          <p className="mt-2 text-sm text-slate-300">
            Railway, SSC, Banking, Police, Teaching aur state exams ke liye pattern-based online mocks.
          </p>
        </div>
        <Link href="/" className="rounded-lg border border-white/20 px-4 py-2 text-sm">Back to Home</Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockExamCategories.map((category) => (
          <article key={category.exam} className="card-anim rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5 transition hover:border-orange-300/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-orange-300">{category.exam}</p>
                <h2 className="mt-2 font-display text-2xl text-white">{category.totalTests} Tests</h2>
              </div>
              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                {category.difficulty}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">Free: {category.freeTests}</span>
              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">Paid: {category.paidTests}</span>
              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">Avg: {category.duration}</span>
              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">{category.pattern}</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">{category.sections}</p>
            <a href="#published-tests" className="btn-gradient btn-anim mt-5 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white">
              Start Practice
            </a>
          </article>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Timer System</p>
              <h2 className="mt-2 font-display text-2xl text-white">Exam-like test controls</h2>
            </div>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100">
              Sticky Timer Ready
            </span>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {timerFeatureList.map((item) => (
              <p key={item} className="rounded-xl border border-white/10 bg-[#071126]/70 px-3 py-2 text-sm text-cyan-50">{item}</p>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Result Analysis</p>
          <h2 className="mt-2 font-display text-2xl text-white">After-submit performance report</h2>
          <div className="mt-5 space-y-2">
            {resultAnalysisList.map((item) => (
              <p key={item} className="rounded-xl border border-white/10 bg-[#071126]/70 px-3 py-2 text-sm text-emerald-50">{item}</p>
            ))}
          </div>
        </section>
      </div>

      <div className="mb-6 rounded-2xl border border-orange-300/20 bg-orange-500/10 p-4 text-sm text-orange-100">
        {publishedCount} online mock test{publishedCount === 1 ? "" : "s"} available, including SSC CGL free mock groups from Test Ranking and free weekly quizzes from Rojgar With Ankit. Admin panel se published mocks bhi yahan visible rahenge.
      </div>

      <div id="published-tests" className="grid gap-4 md:grid-cols-2">
        {mockTests.map((test) => (
          <article key={test.id || test.title} className="card-anim rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">{test.title}</h2>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-orange-300">{test.examName || "Online Mock"}</p>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                {test.accessType || "Online"}
              </span>
            </div>
            {test.summary ? <p className="mt-3 text-sm text-slate-300">{test.summary}</p> : null}
            <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <p>Questions: {test.questions || "-"}</p>
              <p>Marks: {test.marks || test.totalMarks || "-"}</p>
              <p>Duration: {test.duration || "-"}</p>
              <p>Difficulty: {test.difficulty || "-"}</p>
              <p>Negative: {test.negativeMarking || "-"}</p>
              <p>Language: {test.language || "Hindi + English"}</p>
              <p>Mode: {test.examMode || "Online Mock"}</p>
              <p>Result: {test.resultVisibility || "Instant"}</p>
              {test.sourceName ? <p>Source: {test.sourceName}</p> : null}
              {test.groupLabel ? <p>Group: {test.groupLabel}</p> : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(test.sectionTiming ? [test.sectionTiming] : ["Section timer ready"]).concat(mockInterfaceActions.slice(0, 3)).map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200">{item}</span>
              ))}
            </div>
            {test.fileName ? <p className="mt-3 text-xs text-cyan-200">Material: {test.fileName}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              {test.testUrl ? (
                <a
                  href={test.testUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-gradient btn-anim rounded-lg px-4 py-2 text-sm font-semibold text-white"
                >
                  Start Online Test
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 opacity-70"
                >
                  Link Coming Soon
                </button>
              )}
              <Link href="/contact" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-100 hover:border-orange-300">
                Ask Support
              </Link>
            </div>
          </article>
        ))}
      </div>

      {mcqSets.length ? (
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl">Telegram MCQ Practice</h2>
              <p className="mt-2 text-sm text-slate-300">
                {mcqSets.length} published set{mcqSets.length === 1 ? "" : "s"} with {mcqCount} question{mcqCount === 1 ? "" : "s"}.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {mcqSets.map((set) => (
              <article key={set._id || set.id || set.title} className="rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl">{set.title}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-orange-300">{set.examName || "Online MCQ"}</p>
                  </div>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                    {set.questions?.length || 0} MCQs
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {(Array.isArray(set.questions) ? set.questions : []).map((item, index) => (
                    <div key={`${set._id || set.id || set.title}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="font-semibold text-white">Q{index + 1}. {item.question}</p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                        {(Array.isArray(item.options) ? item.options : []).map((option, optionIndex) => (
                          <p key={`${option}-${optionIndex}`} className={optionIndex === item.answer ? "text-emerald-200" : ""}>
                            {String.fromCharCode(65 + optionIndex)}. {option}
                          </p>
                        ))}
                      </div>
                      {item.explanation ? <p className="mt-3 text-sm text-cyan-100">Explanation: {item.explanation}</p> : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
