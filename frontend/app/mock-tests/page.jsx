"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readAdminWorkspace } from "@/lib/adminWorkspace";
import { apiFetch } from "@/lib/api";
import {
  mockExamCategories,
  mockInterfaceActions,
  originalFreePracticeQuestions,
  resultAnalysisList,
  topicWisePdfMockCards,
  topicWiseAiMocks,
  timerFeatureList
} from "@/lib/mockTestCatalog";

const internalPracticeHref = "/mock-tests/free-practice";

const fallbackOnlineMocks = [
  ...topicWiseAiMocks,
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

  [...topicWiseAiMocks, ...publishedWorkspaceMocks].forEach((item) => {
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
  const [pdfMaterials, setPdfMaterials] = useState([]);
  const [pdfQuestionTests, setPdfQuestionTests] = useState([]);

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

  useEffect(() => {
    let active = true;

    const loadPdfQuestionTests = async () => {
      try {
        const response = await fetch("/mock-pdfs/mock-question-bank.json");
        const data = await response.json();
        if (active) {
          setPdfQuestionTests(Array.isArray(data) ? data : []);
        }
      } catch {
        if (active) {
          setPdfQuestionTests([]);
        }
      }
    };

    loadPdfQuestionTests();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadPdfMaterials = async () => {
      try {
        const response = await fetch("/mock-pdfs/manifest.json");
        const data = await response.json();
        if (active) {
          setPdfMaterials(Array.isArray(data) ? data : []);
        }
      } catch {
        if (active) {
          setPdfMaterials([]);
        }
      }
    };

    loadPdfMaterials();
    return () => {
      active = false;
    };
  }, []);

  const publishedCount = useMemo(() => mockTests.length, [mockTests]);
  const mcqCount = useMemo(
    () => mcqSets.reduce((total, item) => total + (Array.isArray(item.questions) ? item.questions.length : 0), 0),
    [mcqSets]
  );
  const availablePdfCount = useMemo(() => pdfMaterials.filter((item) => item.status === "available").length, [pdfMaterials]);
  const pdfQuestionCount = useMemo(
    () => pdfQuestionTests.reduce((total, test) => total + (Array.isArray(test.questions) ? test.questions.length : 0), 0),
    [pdfQuestionTests]
  );
  const subjectWisePdfMocks = useMemo(() => {
    const subjects = new Map();
    pdfQuestionTests.forEach((test) => {
      (Array.isArray(test.questions) ? test.questions : []).forEach((question) => {
        const subject = question.section || test.subject || "Mixed Practice";
        const current = subjects.get(subject) || { subject, questions: 0, tests: new Set() };
        current.questions += 1;
        current.tests.add(test.title);
        subjects.set(subject, current);
      });
    });
    return Array.from(subjects.values()).map((item) => ({ ...item, tests: item.tests.size })).sort((a, b) => b.questions - a.questions);
  }, [pdfQuestionTests]);

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
        {publishedCount} topic-wise mock test{publishedCount === 1 ? "" : "s"} available with BadamClasses original practice content and AI-help guidance. External TestRanking/RWA cards removed.
      </div>

      {subjectWisePdfMocks.length ? (
        <section className="mb-8 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">PDF to Mock</p>
              <h2 className="mt-2 font-display text-3xl text-white">Subject-wise Uploaded PDF Questions</h2>
              <p className="mt-2 text-sm text-slate-300">
                {pdfQuestionTests.length} PDF mock sets converted into {pdfQuestionCount} website questions with topic filters.
              </p>
            </div>
            <Link href="/mock-tests/free-practice" className="btn-gradient btn-anim rounded-xl px-4 py-2 text-sm font-semibold text-white">
              Attempt PDF Mock
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {subjectWisePdfMocks.map((item) => (
              <article key={item.subject} className="rounded-xl border border-white/10 bg-[#071126]/75 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-orange-300">{item.subject}</p>
                <h3 className="mt-2 font-display text-2xl text-white">{item.questions} Questions</h3>
                <p className="mt-2 text-sm text-slate-300">{item.tests} PDF set{item.tests === 1 ? "" : "s"} covered</p>
                <p className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-50">
                  AI help: attempt weak topic, submit, then revise pending answer key notes.
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-8 rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Topic-wise Mock Database</p>
            <h2 className="mt-2 font-display text-3xl text-white">PDF Questions Converted into Mock Cards</h2>
            <p className="mt-2 text-sm text-slate-300">
              Maths, Reasoning, General Awareness, General Science, English and State Exam topics are ready for practice.
            </p>
          </div>
          <Link href="/mock-tests/free-practice" className="btn-gradient btn-anim rounded-xl px-4 py-2 text-sm font-semibold text-white">
            Start Any Topic
          </Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topicWisePdfMockCards.map((mock) => (
            <article key={`${mock.subject}-${mock.title}`} className="rounded-2xl border border-white/10 bg-[#071126]/75 p-4 transition hover:border-orange-300/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-orange-300">{mock.subject}</p>
                  <h3 className="mt-2 font-display text-xl text-white">{mock.title}</h3>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                  Active
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">Topic: {mock.topic}</span>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">Questions: {mock.questions}</span>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">Level: {mock.difficulty}</span>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">Time: {mock.time}</span>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">Negative: {mock.negative}</span>
                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">{mock.type}</span>
              </div>
              <p className="mt-3 text-xs text-slate-400">Source PDF: {mock.source}</p>
              <p className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-50">
                AI help: attempt this topic, submit, then revise weak questions before next mock.
              </p>
              <Link href="/mock-tests/free-practice" className="btn-gradient btn-anim mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white">
                Start Mock
              </Link>
            </article>
          ))}
        </div>
      </section>

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
              {test.groupLabel ? <p>Group: {test.groupLabel}</p> : null}
            </div>
            {test.aiHint ? (
              <p className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-50">
                {test.aiHint}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {(test.sectionTiming ? [test.sectionTiming] : ["Section timer ready"]).concat(mockInterfaceActions.slice(0, 3)).map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200">{item}</span>
              ))}
            </div>
            {test.fileName ? <p className="mt-3 text-xs text-cyan-200">Material: {test.fileName}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              {test.testUrl && test.testUrl !== internalPracticeHref ? (
                <a href={test.testUrl} target="_blank" rel="noreferrer" className="btn-gradient btn-anim rounded-lg px-4 py-2 text-sm font-semibold text-white">
                  Start Online Test
                </a>
              ) : (
                <Link href={internalPracticeHref} className="btn-gradient btn-anim rounded-lg px-4 py-2 text-sm font-semibold text-white">
                  Start Practice
                </Link>
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

      <section className="mt-10 rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">BadamClasses Original</p>
            <h2 className="mt-2 font-display text-3xl text-white">Free Practice Questions Uploaded</h2>
          </div>
          <Link href={internalPracticeHref} className="btn-gradient btn-anim rounded-xl px-4 py-2 text-sm font-semibold text-white">
            Attempt Now
          </Link>
        </div>
        <p className="mt-3 text-sm text-slate-300">
          {originalFreePracticeQuestions.length} original SSC-style questions with answer explanations are available inside the website.
        </p>
      </section>

      {pdfMaterials.length ? (
        <section className="mt-10 rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">PDF Mock Library</p>
              <h2 className="mt-2 font-display text-3xl text-white">Railway, SSC & Exam PDF Practice</h2>
              <p className="mt-2 text-sm text-slate-300">
                {availablePdfCount} PDFs uploaded on website. Large PDFs are listed for cloud upload because direct Git/Vercel file size is too high.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pdfMaterials.map((pdf) => (
              <article key={pdf.id} className="rounded-2xl border border-white/10 bg-[#071126]/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-orange-300">{pdf.category}</p>
                    <h3 className="mt-2 font-display text-xl text-white">{pdf.title}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${pdf.status === "available" ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"}`}>
                    {pdf.status === "available" ? "Uploaded" : "Cloud Needed"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">{pdf.language}</span>
                  <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">{pdf.sizeMb} MB</span>
                </div>
                {pdf.href ? (
                  <a href={pdf.href} target="_blank" rel="noreferrer" className="btn-gradient btn-anim mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white">
                    Open PDF
                  </a>
                ) : (
                  <button type="button" disabled className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 opacity-75">
                    Upload via Cloud Storage
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
