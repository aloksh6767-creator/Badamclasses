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
import { enrichMockTests } from "@/lib/mockQuestionFilters";

const internalPracticeHref = "/mock-tests/free-practice";
const mockModeTabs = [
  { id: "full", label: "Full Mock" },
  { id: "sectional", label: "Sectional Mock" },
  { id: "topic", label: "Topic Wise Mock" },
  { id: "mini", label: "Mini Mocks" }
];
const railwayExamTerms = ["railway", "rrb", "ntpc", "alp", "technician", "paramedical"];
const examMatchTerms = {
  Railway: railwayExamTerms,
  SSC: ["ssc", "cgl", "mts", "chsl"],
  Banking: ["banking", "bank", "ibps", "sbi", "rbi", "po", "clerk"],
  Police: ["police", "constable"],
  Teaching: ["teaching", "tet", "ctet", "uptet", "cdp"],
  "State Exams": ["state exams", "state", "up constable", "up police", "constable"]
};
const categoryIcons = { Railway: "train", SSC: "clipboard", Banking: "bank", Police: "shield", Teaching: "school", "State Exams": "landmark" };
const getSubExamIcon = (name, exam) => {
  const value = `${name} ${exam}`.toLowerCase();
  if (/railway|rrb/.test(value)) return "train";
  if (/bank|ibps|sbi|rbi/.test(value)) return "bank";
  if (/police|constable|rpf|\bsi\b|\bgd\b/.test(value)) return "shield";
  if (/teaching|tet|ctet|reet|tgt|pgt/.test(value)) return "school";
  if (/state|psc|bihar|up exams|mp exams/.test(value)) return "landmark";
  return "clipboard";
};

const getSearchableMockText = (item = {}) => [
  item.examName,
  item.exam,
  item.title,
  item.subject,
  item.topic,
  item.source,
  item.groupLabel,
  item.summary,
  item.fileName,
  item.type
].filter(Boolean).join(" ").toLowerCase();

const mockMatchesExam = (item, exam) => {
  const text = getSearchableMockText(item);
  const terms = examMatchTerms[exam] || [exam.toLowerCase()];
  return terms.some((term) => text.includes(term));
};

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

const buildPracticeHref = ({ exam = "", testId = "", subject = "" } = {}) => {
  const params = new URLSearchParams();
  if (exam) params.set("exam", exam);
  if (testId) params.set("test", testId);
  if (subject) params.set("subject", subject);
  const query = params.toString();
  return query ? `${internalPracticeHref}?${query}` : internalPracticeHref;
};

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
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedMockMode, setSelectedMockMode] = useState("full");
  const [mockTests, setMockTests] = useState(fallbackOnlineMocks);
  const [mcqSets, setMcqSets] = useState([]);
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
        let runtimeTests = [];
        try {
          const runtime = await apiFetch("/automation/public-pdf-mocks");
          runtimeTests = Array.isArray(runtime?.mockTests) ? runtime.mockTests : [];
        } catch {
          runtimeTests = [];
        }
        if (active) {
          const byId = new Map();
          [...(Array.isArray(data) ? data : []), ...runtimeTests].forEach((test) => {
            if (test?.id && !byId.has(test.id)) byId.set(test.id, test);
          });
          setPdfQuestionTests(enrichMockTests(Array.from(byId.values())));
        }
      } catch {
        try {
          const runtime = await apiFetch("/automation/public-pdf-mocks");
          if (active) {
            setPdfQuestionTests(enrichMockTests(Array.isArray(runtime?.mockTests) ? runtime.mockTests : []));
          }
        } catch {
          if (active) {
            setPdfQuestionTests([]);
          }
        }
      }
    };

    loadPdfQuestionTests();
    return () => {
      active = false;
    };
  }, []);

  const filteredMockTests = useMemo(
    () => selectedExam ? mockTests.filter((test) => mockMatchesExam(test, selectedExam)) : [],
    [mockTests, selectedExam]
  );
  const filteredTopicWisePdfMockCards = useMemo(
    () => selectedExam ? topicWisePdfMockCards.filter((mock) => mockMatchesExam(mock, selectedExam)) : [],
    [selectedExam]
  );
  const filteredPdfQuestionTests = useMemo(
    () => selectedExam ? pdfQuestionTests.filter((test) => mockMatchesExam(test, selectedExam)) : [],
    [pdfQuestionTests, selectedExam]
  );
  const filteredMcqSets = useMemo(
    () => selectedExam ? mcqSets.filter((set) => mockMatchesExam(set, selectedExam)) : [],
    [mcqSets, selectedExam]
  );
  const publishedCount = useMemo(() => filteredMockTests.length, [filteredMockTests]);
  const mcqCount = useMemo(
    () => filteredMcqSets.reduce((total, item) => total + Number(item.questionCount || 0), 0),
    [filteredMcqSets]
  );
  const pdfQuestionCount = useMemo(
    () => filteredPdfQuestionTests.reduce((total, test) => total + (Array.isArray(test.questions) ? test.questions.length : 0), 0),
    [filteredPdfQuestionTests]
  );
  const subjectWisePdfMocks = useMemo(() => {
    const subjects = new Map();
    filteredPdfQuestionTests.forEach((test) => {
      (Array.isArray(test.questions) ? test.questions : []).forEach((question) => {
        const subject = question.subject || question.section || test.subject || "Mixed Practice";
        const current = subjects.get(subject) || { subject, questions: 0, tests: new Set(), chapters: new Set() };
        current.questions += 1;
        current.tests.add(test.title);
        if (question.chapter || question.topic) current.chapters.add(question.chapter || question.topic);
        subjects.set(subject, current);
      });
    });
    return Array.from(subjects.values())
      .map((item) => ({ ...item, tests: item.tests.size, chapters: item.chapters.size }))
      .sort((a, b) => b.questions - a.questions);
  }, [filteredPdfQuestionTests]);
  const selectedCategory = useMemo(
    () => mockExamCategories.find((category) => category.exam === selectedExam),
    [selectedExam]
  );
  const fullMockChoices = useMemo(() => {
    if (!selectedExam) return [];
    const fullMocks = filteredMockTests.filter((test) => {
      const text = `${test.examMode || ""} ${test.title || ""}`.toLowerCase();
      return text.includes("full") || text.includes("complete");
    });
    const source = fullMocks.length ? fullMocks : filteredMockTests;
    if (!source.length && selectedCategory?.subExams?.length) {
      return selectedCategory.subExams.map((item) => ({
        id: item.name,
        title: `${item.name} Full Mock`,
        subtitle: selectedExam,
        meta: `${selectedCategory.duration} • ${selectedCategory.pattern}`,
        href: buildPracticeHref({ exam: selectedExam, testId: item.name })
      }));
    }
    return source.map((test) => ({
      id: test.id || test.title,
      title: test.title,
      subtitle: test.examName || selectedExam,
      meta: `${test.questions || "-"} Questions • ${test.duration || "Exam timer"}`,
      href: buildPracticeHref({ exam: selectedExam, testId: test.id || test.title })
    }));
  }, [filteredMockTests, selectedCategory, selectedExam]);
  const sectionalMockChoices = useMemo(() => {
    if (!selectedExam) return [];
    return subjectWisePdfMocks.map((item) => {
      const matchingTest = filteredPdfQuestionTests.find((test) =>
        (Array.isArray(test.questions) ? test.questions : []).some((question) => (question.subject || question.section || test.subject || "Mixed Practice") === item.subject)
      );
      return {
        id: `section-${item.subject}`,
        title: `${item.subject} Sectional Mock`,
        subtitle: `${selectedExam} section practice`,
        meta: `${item.questions} Questions • ${item.tests} PDF set${item.tests === 1 ? "" : "s"}`,
        href: buildPracticeHref({ exam: selectedExam, testId: matchingTest?.id || matchingTest?.title || "", subject: item.subject })
      };
    });
  }, [filteredPdfQuestionTests, selectedExam, subjectWisePdfMocks]);
  const topicMockChoices = useMemo(() => {
    if (!selectedExam) return [];
    return filteredTopicWisePdfMockCards.map((mock) => ({
      id: `${mock.subject}-${mock.title}`,
      title: mock.title,
      subtitle: mock.topic || mock.subject,
      meta: `${mock.questions} Questions • ${mock.time}`,
      href: buildPracticeHref({ exam: selectedExam, testId: mock.title })
    }));
  }, [filteredTopicWisePdfMockCards, selectedExam]);
  const miniMockChoices = useMemo(() => {
    if (!selectedExam) return [];
    const shortMocks = filteredMockTests.filter((test) => Number(test.questions || 0) && Number(test.questions || 0) <= 30);
    const mcqMocks = filteredMcqSets.map((set) => ({
      id: set._id || set.id || set.title,
      title: set.title,
      subtitle: set.examName || `${selectedExam} quick practice`,
      meta: `${set.questionCount || 0} MCQs • Timed test`,
      href: `/test/${encodeURIComponent(set._id || set.id)}`
    }));
    return [
      ...shortMocks.map((test) => ({
        id: test.id || test.title,
        title: test.title,
        subtitle: test.examName || selectedExam,
        meta: `${test.questions || "-"} Questions • ${test.duration || "Quick timer"}`,
        href: buildPracticeHref({ exam: selectedExam, testId: test.id || test.title })
      })),
      ...mcqMocks
    ];
  }, [filteredMcqSets, filteredMockTests, selectedExam]);
  const mockChoicesByMode = {
    full: fullMockChoices,
    sectional: sectionalMockChoices,
    topic: topicMockChoices,
    mini: miniMockChoices
  };
  const activeMockChoices = mockChoicesByMode[selectedMockMode] || [];
  const handleExamSelect = (exam) => {
    setSelectedExam(exam);
    setSelectedMockMode("full");
  };

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
        <div className="flex flex-wrap gap-2">
          <Link href="/ssc-answer-keys" className="rounded-lg border border-cyan-300/30 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/10">SSC Official Answer Keys</Link>
          <Link href="/" className="rounded-lg border border-white/20 px-4 py-2 text-sm">Back to Home</Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockExamCategories.map((category) => (
          <Link
            key={category.exam}
            href={`/test-rank?exam=${encodeURIComponent(category.exam)}&mode=full#all-tests`}
            className={`card-anim rounded-2xl border p-5 text-left transition hover:border-orange-300/40 ${
              selectedExam === category.exam ? "border-orange-300/50 bg-orange-500/10" : "border-white/10 bg-[#0d1a3a]/70"
            }`}
          >
            {category.logoImage ? (
              <div className="mb-4 flex h-36 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white p-2 shadow-[0_18px_40px_rgba(2,6,23,0.18)]">
                <img
                  src={category.logoImage}
                  alt={category.logoAlt || `${category.exam} mock test logo`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-300/35 bg-orange-500/15 text-orange-100 shadow-[0_10px_30px_rgba(251,146,60,0.18)]">
                  <MockIcon name={categoryIcons[category.exam] || "clipboard"} className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-orange-300">{category.exam}</p>
                  <h2 className="mt-2 font-display text-2xl text-white">{category.totalTests} Tests</h2>
                </div>
              </div>
              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                {category.difficulty}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
              {[
                { label: "Free", value: category.freeTests, icon: "check" },
                { label: "Premium", value: category.paidTests, icon: "award" },
                { label: "Average", value: category.duration, icon: "clock" },
                { label: "Pattern", value: category.pattern, icon: "layers" }
              ].map((item) => <span key={item.label} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"><MockIcon name={item.icon} className="h-4 w-4 shrink-0 text-cyan-200" /><span className="truncate">{item.label}: <b className="font-semibold text-white">{item.value}</b></span></span>)}
            </div>
            <p className="mt-3 text-xs text-slate-400">{category.sections}</p>
            {Array.isArray(category.subExams) && category.subExams.length ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {category.subExams.map((item) => (
                  <span key={item.name} className="flex min-w-0 items-center gap-2 rounded-xl border border-cyan-300/15 bg-cyan-400/10 px-2 py-2 text-xs text-cyan-50">
                    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-300/35 bg-orange-500/15 text-orange-100">
                      <MockIcon name={getSubExamIcon(item.name, category.exam)} className="h-4 w-4" />
                    </span>
                    <span className="truncate font-semibold">{item.name}</span>
                  </span>
                ))}
              </div>
            ) : null}
            <span className="btn-gradient btn-anim mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-950/20">
              Open {category.exam} Mock <MockIcon name="arrow" className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>

      {false && selectedExam ? (
        <section className="mb-8 overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#071126]/90 shadow-[0_20px_60px_rgba(8,145,178,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-300/20 bg-cyan-400/10 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-300/35 bg-orange-500/15 text-2xl"
              >
                {selectedCategory?.logo || "BC"}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">{selectedExam} Mock Library</p>
                <h2 className="mt-1 font-display text-2xl text-white">Choose mock type, then start selected test</h2>
              </div>
            </div>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-cyan-100">
              Opens in exam interface
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-white/10 bg-[#0d1a3a]/80 p-3 md:grid-cols-4">
            {mockModeTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedMockMode(tab.id)}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                  selectedMockMode === tab.id
                    ? "border-orange-300/50 bg-orange-500/20 text-white shadow-[0_12px_30px_rgba(251,146,60,0.18)]"
                    : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-cyan-300/30 hover:bg-cyan-400/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {selectedCategory?.subExams?.length ? (
            <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-5 py-3">
              {selectedCategory.subExams.map((item) => (
                <span key={item.name} className="flex shrink-0 items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-50">
                  <span aria-hidden="true">{item.logo}</span>
                  {item.name}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_35%),#0b1428] p-5 md:grid-cols-2 xl:grid-cols-3">
            {activeMockChoices.map((mock, index) => (
              <Link
                key={mock.id || mock.title}
                href={mock.href}
                target="_blank"
                className={`group min-h-36 rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:border-orange-300/45 ${
                  index === 0
                    ? "border-orange-300/35 bg-orange-500/15"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
                  {mockModeTabs.find((tab) => tab.id === selectedMockMode)?.label}
                </p>
                <h3 className="mt-3 font-display text-xl text-white group-hover:text-orange-100">{mock.title}</h3>
                <p className="mt-2 text-sm text-cyan-100">{mock.subtitle}</p>
                <p className="mt-4 rounded-xl border border-white/10 bg-[#071126]/70 px-3 py-2 text-xs text-slate-300">{mock.meta}</p>
                <span className="btn-gradient btn-anim mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white">
                  Open Mock
                </span>
              </Link>
            ))}
            {!activeMockChoices.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-300 md:col-span-2 xl:col-span-3">
                {selectedExam} ke liye is mock type me abhi test publish nahi hai. Dusra tab choose karein ya admin se PDF/mock publish karein.
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="min-w-0 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Timer System</p>
              <h2 className="mt-2 font-display text-2xl text-white">Exam-like test controls</h2>
            </div>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100">
              Sticky Timer Ready
            </span>
          </div>
          <div className="mt-5 grid min-w-0 gap-2 sm:grid-cols-2">
            {timerFeatureList.map((item) => (
              <p key={item} className="min-w-0 break-words rounded-xl border border-white/10 bg-[#071126]/70 px-3 py-2 text-sm text-cyan-50">{item}</p>
            ))}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Result Analysis</p>
          <h2 className="mt-2 font-display text-2xl text-white">After-submit performance report</h2>
          <div className="mt-5 space-y-2">
            {resultAnalysisList.map((item) => (
            <p key={item} className="min-w-0 break-words rounded-xl border border-white/10 bg-[#071126]/70 px-3 py-2 text-sm text-emerald-50">{item}</p>
            ))}
          </div>
        </section>
      </div>

      {!selectedExam ? (
        <div className="mb-8 rounded-2xl border border-orange-300/20 bg-orange-500/10 p-5 text-sm text-orange-100">
          Upar se exam select karein. Exam click karte hi sirf us exam ke mock tests, PDF questions aur practice sets yahan dikhenge.
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-orange-300/20 bg-orange-500/10 p-4 text-sm text-orange-100">
          {publishedCount} {selectedExam} mock test{publishedCount === 1 ? "" : "s"} available with BadamClasses original practice content and AI-help guidance. External TestRanking/RWA cards removed.
        </div>
      )}

      {selectedExam && subjectWisePdfMocks.length ? (
        <section className="mb-8 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">PDF to Mock</p>
              <h2 className="mt-2 font-display text-3xl text-white">Subject-wise Uploaded PDF Questions</h2>
              <p className="mt-2 text-sm text-slate-300">
                {filteredPdfQuestionTests.length} {selectedExam} PDF mock set{filteredPdfQuestionTests.length === 1 ? "" : "s"} converted into {pdfQuestionCount} website questions with topic filters.
              </p>
            </div>
            <Link href={buildPracticeHref({ exam: selectedExam })} target="_blank" className="btn-gradient btn-anim rounded-xl px-4 py-2 text-sm font-semibold text-white">
              Attempt PDF Mock
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {subjectWisePdfMocks.map((item) => (
              <article key={item.subject} className="rounded-xl border border-white/10 bg-[#071126]/75 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-orange-300">{item.subject}</p>
                <h3 className="mt-2 font-display text-2xl text-white">{item.questions} Questions</h3>
                <p className="mt-2 text-sm text-slate-300">{item.tests} PDF set{item.tests === 1 ? "" : "s"} covered</p>
                <p className="mt-1 text-xs text-slate-400">{item.chapters} AI chapter filter{item.chapters === 1 ? "" : "s"}</p>
                <p className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-50">
                  AI help: attempt weak topic, submit, then revise pending answer key notes.
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {selectedExam ? (
        <section className="mb-8 rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Topic-wise Mock Database</p>
              <h2 className="mt-2 font-display text-3xl text-white">{selectedExam} Mock Cards</h2>
              <p className="mt-2 text-sm text-slate-300">
                Sirf selected {selectedExam} exam ke topic mocks dikh rahe hain.
              </p>
            </div>
            <Link href={buildPracticeHref({ exam: selectedExam })} target="_blank" className="btn-gradient btn-anim rounded-xl px-4 py-2 text-sm font-semibold text-white">
              Start Any Topic
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTopicWisePdfMockCards.map((mock) => (
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
                <Link href={buildPracticeHref({ exam: selectedExam, testId: mock.title })} target="_blank" className="btn-gradient btn-anim mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white">
                  Start Mock
                </Link>
              </article>
            ))}
          </div>
          {filteredTopicWisePdfMockCards.length ? null : (
            <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
              No {selectedExam} topic mocks are published yet.
            </p>
          )}
        </section>
      ) : null}

      {selectedExam ? <div id="published-tests" className="grid gap-4 md:grid-cols-2">
        {filteredMockTests.map((test) => (
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
                <Link href={buildPracticeHref({ exam: selectedExam, testId: test.id || test.title })} target="_blank" className="btn-gradient btn-anim rounded-lg px-4 py-2 text-sm font-semibold text-white">
                  Start Practice
                </Link>
              )}
              <Link href="/contact" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-100 hover:border-orange-300">
                Ask Support
              </Link>
            </div>
          </article>
        ))}
      </div> : null}
      {selectedExam && !filteredMockTests.length ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-[#0d1a3a]/70 px-4 py-3 text-sm text-slate-300">
          No {selectedExam} online mocks are published yet.
        </p>
      ) : null}

      {selectedExam && filteredMcqSets.length ? (
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl">Telegram MCQ Practice</h2>
              <p className="mt-2 text-sm text-slate-300">
                {filteredMcqSets.length} published {selectedExam} set{filteredMcqSets.length === 1 ? "" : "s"} with {mcqCount} question{mcqCount === 1 ? "" : "s"}. Start a timed test to answer and receive a verified result.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {filteredMcqSets.map((set) => (
              <article key={set._id || set.id || set.title} className="rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl">{set.title}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-orange-300">{set.examName || "Online MCQ"}</p>
                  </div>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                    {set.questionCount || 0} MCQs
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-300">Question previews and answer keys are hidden until you submit, so the practice result reflects a real attempt.</p>
                <Link href={`/test/${encodeURIComponent(set._id || set.id)}`} className="mt-4 inline-flex rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-400">Start timed test →</Link>
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

    </main>
  );
}

function MockIcon({ name, className = "h-5 w-5" }) {
  const paths = {
    train: <><rect x="5" y="3" width="14" height="15" rx="4"/><path d="M8 7h8M8 12h.01M16 12h.01M8 21l2-3m6 3-2-3M5 15h14"/></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h3"/></>,
    bank: <><path d="m3 9 9-6 9 6M4 10h16M5 20h14M7 10v7m5-7v7m5-7v7M3 20h18"/></>,
    shield: <><path d="m12 3 8 3v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/></>,
    school: <><path d="m3 9 9-6 9 6-9 6zM6 11v6c3.5 3 8.5 3 12 0v-6M21 9v7"/></>,
    landmark: <><path d="m3 9 9-6 9 6M4 10h16M5 20h14M7 10v7m5-7v7m5-7v7M3 20h18"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    award: <><circle cx="12" cy="8" r="5"/><path d="m8 12-1 9 5-3 5 3-1-9M10 8l1.3 1.3L14.5 7"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.clipboard}</svg>;
}
