"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";
import { readAdminWorkspace } from "@/lib/adminWorkspace";
import { mockExamCategories, topicWiseAiMocks } from "@/lib/mockTestCatalog";
import { enrichMockTests } from "@/lib/mockQuestionFilters";

const tabs = ["All Tests", "Free Tests", "Premium Tests", "Previous Year Papers", "Practice Sets"];
const mockModes = [{ id: "all", label: "All Mocks", icon: "grid" }, { id: "full", label: "Full Mock", icon: "test" }, { id: "sectional", label: "Sectional Mock", icon: "layers" }, { id: "topic", label: "Topic / Chapter Mock", icon: "book" }, { id: "mini", label: "Mini Mocks", icon: "spark" }, { id: "timed", label: "Timed Online Tests", icon: "clock" }];
const examTerms = { Railway: ["railway", "rrb", "ntpc", "alp", "technician"], SSC: ["ssc", "cgl", "mts", "chsl", "cpo", "steno"], Banking: ["bank", "ibps", "sbi", "rbi", "po", "clerk"], Police: ["police", "constable", "rpf"], Teaching: ["teaching", "tet", "ctet", "uptet"], "State Exams": ["state", "psc", "up exams", "mp exams", "bihar"] };
const buildPracticeHref = (exam, testId, subject, topic, chapter) => {
  const params = new URLSearchParams();
  if (exam) params.set("exam", exam);
  if (testId) params.set("test", testId);
  if (subject) params.set("subject", subject);
  if (topic) params.set("topic", topic);
  if (chapter) params.set("chapter", chapter);
  return `/mock-tests/free-practice${params.size ? `?${params}` : ""}`;
};
const normalizeTest = (item, sourceLabel) => {
  const id = String(item.id || item._id || item.title || "mock");
  const questionCount = Number(item.questionCount || item.questionsCount || (Array.isArray(item.questions) ? item.questions.length : item.questions) || 0);
  const access = /paid|premium/i.test(String(item.accessType || "Free")) ? "Premium" : "Free";
  const exam = item.examName || item.exam || item.category || "Mixed Practice";
  const testType = /pyq|previous year/i.test(`${item.type || ""} ${item.title || ""} ${item.source || ""}`)
    ? "Previous Year Papers"
    : /section|topic|mini|drill/i.test(`${item.examMode || ""} ${item.type || ""}`)
      ? "Sectional Tests"
      : questionCount >= 60 || /full|complete/i.test(`${item.examMode || ""} ${item.title || ""}`)
        ? "Full-Length Tests" : "Practice Sets";
  return {
    id, title: item.title || "Practice set", exam, questionCount,
    duration: item.duration || (item.durationMinutes ? `${item.durationMinutes} min` : "—"), marks: item.marks || "—", difficulty: item.difficulty || "Mixed",
    language: item.language || "Hindi + English", access, type: item.testRankType || testType, source: sourceLabel,
    subject: item.subject || item.groupLabel || "", status: item.status || "Available",
    href: item.href || (item.testUrl?.startsWith("/") ? item.testUrl : buildPracticeHref(exam, id, item.subject || ""))
  };
};
const buildChapterTests = (pdfTests = []) => {
  const chapters = new Map();
  pdfTests.forEach((test) => (Array.isArray(test.questions) ? test.questions : []).forEach((question) => {
    const subject = question.subject || question.section || test.subject || "Mixed Practice";
    const topic = question.topic || question.chapter || subject;
    const chapter = question.chapter || topic;
    const key = `${test.id}::${subject}::${chapter}`;
    const current = chapters.get(key) || { test, subject, topic, chapter, questionCount: 0 };
    current.questionCount += 1;
    chapters.set(key, current);
  }));
  return Array.from(chapters.values()).map(({ test, subject, topic, chapter, questionCount }) => normalizeTest({
    id: `${test.id}-chapter-${chapter}`,
    title: `${subject} · ${chapter} Chapter Mock`,
    examName: test.examName || test.exam || "Mixed Practice",
    questionCount,
    subject,
    testRankType: "Topic / Chapter Mock",
    href: buildPracticeHref(test.examName || test.exam, test.id)
  }, "Topic / chapter PDF practice"));
};
const matchesExam = (item, selected) => {
  if (selected === "All exams") return true;
  const text = `${item.exam} ${item.title}`.toLowerCase();
  if (examTerms[selected]) return examTerms[selected].some((term) => text.includes(term));
  return text.includes(selected.toLowerCase());
};

const mainLinks = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" },
  { label: "My Courses", href: "/dashboard", icon: "▣" },
  { label: "Mock Tests", href: "/test-rank", icon: "▤", active: true },
  { label: "Daily Quiz", href: "/mock-tests", icon: "✓", badge: "New" },
  { label: "Current Affairs", href: "/current-affairs", icon: "◉" },
  { label: "Previous Year Papers", href: "/mock-tests", icon: "▧" },
  { label: "Study Material", href: "/class-pdfs", icon: "▤" },
  { label: "Performance", href: "/test-rank#my-performance", icon: "⌁" },
  { label: "My Profile", href: "/profile", icon: "♙" }
];

function Icon({ name, className = "h-5 w-5" }) {
  const shared = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 5.5v15M8 7h8M8 11h8"/></>,
    test: <><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 3.5v-1h6v1M9 9h6M9 13h6M9 17h3"/></>,
    quiz: <><path d="M12 3 4.5 6v5.5c0 4.6 3.2 7.8 7.5 9.5 4.3-1.7 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/></>,
    gift: <><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M12 9H7.5a2.5 2.5 0 1 1 2.4-3.2L12 9Zm0 0h4.5a2.5 2.5 0 1 0-2.4-3.2L12 9Z"/></>,
    news: <><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/><path d="M2 7v12a2 2 0 0 0 2 2"/></>,
    paper: <><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/></>,
    chart: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 5-6"/><path d="M16 7h3v3"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-1 1.1-2 1.4-2 3M12 17h.01"/></>,
    live: <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3M7 3l5 3M12 3 7 6"/></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4L5.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1L9 7.3h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2z"/></>,
    train: <><rect x="5" y="3" width="14" height="15" rx="4"/><path d="M8 7h8M8 12h.01M16 12h.01M8 21l2-3m6 3-2-3M5 15h14"/></>,
    bank: <><path d="m3 9 9-6 9 6M4 10h16M5 20h14M7 10v7m5-7v7m5-7v7M3 20h18"/></>,
    shield: <><path d="m12 3 8 3v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/></>,
    school: <><path d="m3 9 9-6 9 6-9 6zM6 11v6c3.5 3 8.5 3 12 0v-6M21 9v7"/></>,
    government: <><path d="m3 9 9-6 9 6M4 10h16M5 20h14M7 10v7m5-7v7m5-7v7M3 20h18"/><path d="M2 22h20"/></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l1 2.5 2.5 1-2.5 1L19 23l-1-2.5-2.5-1 2.5-1z"/></>,
    course: <><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H20v16H5.5A2.5 2.5 0 0 0 3 21z"/><path d="M3 5.5v15M8 7h8M8 11h8"/></>,
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>
  };
  return <svg {...shared}>{paths[name] || paths.test}</svg>;
}

const navIconNames = ["home", "book", "test", "quiz", "news", "paper", "book", "chart", "user"];
const categoryIconNames = { Railway: "train", SSC: "test", Banking: "bank", Police: "shield", Teaching: "school", "State Exams": "government" };
const subExamIconName = (name, exam) => {
  const value = `${name} ${exam}`.toLowerCase();
  if (/railway|rrb/.test(value)) return "train";
  if (/bank|ibps|sbi|rbi/.test(value)) return "bank";
  if (/police|constable|rpf|\bsi\b|\bgd\b/.test(value)) return "shield";
  if (/teaching|tet|ctet|reet|tgt|pgt/.test(value)) return "school";
  if (/state|psc|bihar|up exams|mp exams/.test(value)) return "government";
  return "test";
};

export default function TestRankPage() {
  const [tests, setTests] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("All Tests");
  const [exam, setExam] = useState("All exams");
  const [mockMode, setMockMode] = useState("all");
  const [subExam, setSubExam] = useState("");
  const [subject, setSubject] = useState("All subjects");
  const [difficulty, setDifficulty] = useState("All levels");
  const [language, setLanguage] = useState("All languages");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(12);
  const chooseExam = (value) => { setExam(value); setSubExam(""); };

  const loadTests = async () => {
    setLoading(true);
    setError("");
    const workspace = readAdminWorkspace();
    const localTests = Array.isArray(workspace.mockTests)
      ? workspace.mockTests.filter((item) => item?.status === "published" && item?.reviewStatus !== "pending" && item?.pipelineStage !== "Admin Review")
        .map((item) => normalizeTest(item, "Published mock")) : [];
    const [mcqResult, pdfResult] = await Promise.allSettled([
      apiFetch("/automation/public-mcqs?limit=100"),
      apiFetch("/automation/public-pdf-mocks")
    ]);
    const mcqTests = mcqResult.status === "fulfilled" && Array.isArray(mcqResult.value?.mcqSets)
      ? mcqResult.value.mcqSets.map((item) => normalizeTest({ ...item, href: `/test/${encodeURIComponent(item._id || item.id)}` }, "Verified online test")) : [];
    const pdfSourceTests = pdfResult.status === "fulfilled" && Array.isArray(pdfResult.value?.mockTests)
      ? enrichMockTests(pdfResult.value.mockTests) : [];
    const pdfTests = pdfSourceTests.map((item) => normalizeTest(item, "Published PDF question set"));
    const chapterTests = buildChapterTests(pdfSourceTests);
    if (mcqResult.status === "rejected" && pdfResult.status === "rejected") {
      setError("Live test lists are unavailable. Showing locally available published tests and practice sets.");
    }
    const allTests = [...localTests, ...pdfTests, ...chapterTests, ...mcqTests, ...topicWiseAiMocks.map((item) => normalizeTest({ ...item, testRankType: /topic/i.test(`${item.examMode || ""} ${item.type || ""}`) ? "Topic / Chapter Mock" : item.testRankType }, "Badam Classes practice"))];
    const seen = new Set();
    setTests(allTests.filter((item) => {
      const key = item.id.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }));
    setLoading(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedExam = params.get("exam");
    const requestedMode = params.get("mode");
    const requestedSubExam = params.get("subExam");
    if (requestedExam && (requestedExam === "All exams" || mockExamCategories.some((category) => category.exam === requestedExam))) setExam(requestedExam);
    if (mockModes.some((mode) => mode.id === requestedMode)) setMockMode(requestedMode);
    if (requestedSubExam) setSubExam(requestedSubExam);
    if (requestedExam) window.setTimeout(() => document.getElementById("all-tests")?.scrollIntoView({ block: "start", behavior: "smooth" }), 100);
    setStudent(getUser());
    if (getToken()) {
      apiFetch("/test-rank/attempts").then((data) => {
        setHistory((data.attempts || []).filter((item) => item.status === "submitted" && item.result).map((item) => ({ id: item.id, title: item.title, percent: Number(item.result.accuracy || 0), scorePercent: item.result.maxMarks ? Math.round((item.result.score / item.result.maxMarks) * 100) : 0, questionCount: item.questionCount || 0, result: item.result })));
      }).catch(() => setHistory([])).finally(() => setHistoryLoading(false));
    } else { setHistory([]); setHistoryLoading(false); }
    loadTests();
  }, []);

  const subjects = useMemo(() => [...new Set(tests.map((item) => item.subject).filter(Boolean))].sort(), [tests]);
  const exams = useMemo(() => [...new Set([...mockExamCategories.flatMap((item) => [item.exam, ...(item.subExams || []).map((examItem) => examItem.name)]), ...tests.map((item) => item.exam)])].sort(), [tests]);
  const selectedCategory = mockExamCategories.find((item) => item.exam === exam);
  const filteredTests = useMemo(() => tests.filter((item) => {
    const searchable = `${item.title} ${item.exam} ${item.source} ${item.subject}`.toLowerCase();
    const matchesTab = tab === "All Tests" || tab === `${item.access} Tests` || tab === item.type;
    const modeText = `${item.title} ${item.type} ${item.examMode || ""} ${item.subject || ""}`.toLowerCase();
    const matchesMode = mockMode === "all"
      || (mockMode === "timed" && item.source === "Verified online test")
      || (mockMode === "full" && (item.type === "Full-Length Tests" || (item.type !== "Topic / Chapter Mock" && (/full|complete/i.test(modeText) || item.questionCount >= 60))))
      || (mockMode === "sectional" && item.type === "Sectional Tests" && !/topic|chapter/i.test(modeText))
      || (mockMode === "topic" && item.type === "Topic / Chapter Mock")
      || (mockMode === "mini" && item.questionCount > 0 && item.questionCount <= 30);
    return matchesTab && matchesMode && matchesExam(item, exam)
      && (!subExam || modeText.includes(subExam.toLowerCase()))
      && (subject === "All subjects" || item.subject === subject)
      && (difficulty === "All levels" || item.difficulty === difficulty)
      && (language === "All languages" || item.language.includes(language))
      && searchable.includes(search.toLowerCase());
  }), [tests, tab, mockMode, exam, subExam, subject, difficulty, language, search]);
  const average = history.length ? Math.round(history.reduce((sum, item) => sum + Number(item.percent || 0), 0) / history.length) : null;
  const completionProgress = tests.length ? Math.min(100, Math.round((history.length / tests.length) * 100)) : 0;
  const best = history.length ? Math.max(...history.map((item) => Number(item.scorePercent || 0))) : null;
  const averageTimePerQuestion = history.length ? Math.round(history.reduce((sum, item) => sum + Number(item.result?.timeTakenSeconds || 0) / Math.max(1, item.questionCount), 0) / history.length) : null;

  return (
    <div className="min-h-screen bg-[#030d1b] text-slate-100 md:flex">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sky-400/15 bg-[#041124] px-4 py-5 md:flex">
        <Link href="/" className="mb-8 flex items-center rounded-xl border border-white/[.07] bg-[#071a33] px-2 py-1.5">
          <Image src="/new-logo.webp" alt="Badam Classes" width={1536} height={1024} className="h-12 w-full rounded-lg object-cover object-center" />
        </Link>
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[.18em] text-sky-300">Learning Center</p>
        <nav className="grid gap-1">
          {mainLinks.map((item, index) => <Link key={item.label} href={item.href} aria-current={item.active ? "page" : undefined} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[13px] transition ${item.active ? "border-blue-400/50 bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-lg shadow-blue-950/30" : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"}`}><Icon name={navIconNames[index]} className="h-[18px] w-[18px] shrink-0" />{item.label}{item.badge ? <span className="ml-auto rounded bg-blue-700 px-2 text-[10px]">{item.badge}</span> : null}</Link>)}
        </nav>
        <p className="mb-2 mt-7 border-t border-white/10 px-2 pt-5 text-[10px] font-bold uppercase tracking-[.18em] text-sky-300">Quick Access</p>
        <nav className="grid gap-1">{[{ label: "Doubt Support", href: "/contact", icon: "help" }, { label: "Live Classes", href: "/batches", icon: "live" }, { label: "Notifications", href: "/dashboard", icon: "bell" }, { label: "Settings", href: "/profile", icon: "settings" }].map((item) => <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-slate-300 transition hover:bg-white/5 hover:text-white"><Icon name={item.icon} className="h-[18px] w-[18px]" />{item.label}</Link>)}</nav>
        <div className="mt-auto rounded-xl border border-blue-300/20 bg-gradient-to-br from-blue-500/10 to-amber-500/[.06] p-4"><p className="flex items-center gap-2 text-sm font-bold text-amber-200"><span aria-hidden="true">♛</span> Go Premium</p><p className="mt-2 text-xs leading-5 text-slate-300">Unlock courses, tests, mock exams and expert guidance.</p><Link href="/courses" className="mt-4 block rounded-lg bg-amber-400 px-3 py-2 text-center text-xs font-bold text-slate-950 transition hover:bg-amber-300">Explore Courses <span aria-hidden="true">→</span></Link></div>
      </aside>

      <div className="min-w-0 flex-1 md:ml-64">
        <header className="relative z-20 border-b border-sky-400/15 bg-[#020b18] px-4 py-4 md:flex md:min-h-[66px] md:items-center md:justify-between md:gap-3 md:px-7 md:py-3">
          <div className="space-y-4 md:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href={student ? "/profile" : "/login"} className="flex min-w-0 items-center gap-3" aria-label={student ? "Open profile" : "Log in"}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-white/80 bg-gradient-to-br from-cyan-400 to-blue-700 text-lg font-bold text-white shadow-lg shadow-blue-950/40">{student?.name?.[0]?.toUpperCase() || <Icon name="user" className="h-6 w-6" />}</span>
                <span className="min-w-0"><span className="block text-sm text-blue-100">Hi,</span><span className="block truncate text-xl font-bold leading-tight text-white">{student?.name || "Learner"} <span aria-hidden="true">👋</span></span></span>
              </Link>
              <div className="flex shrink-0 items-center gap-2"><Link href="/contact" aria-label="Contact support" className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/[.08] text-white transition hover:bg-white/15"><Icon name="help" className="h-5 w-5" /></Link><Link href="/dashboard" aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10"><Icon name="bell" className="h-5 w-5" /></Link></div>
            </div>
            <nav aria-label="TestRank sections" className="grid grid-cols-2 rounded-full border border-violet-400/40 bg-[#070810] p-1 shadow-[0_0_20px_rgba(91,33,182,.2)]">
              <Link href="/" className="flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 text-[11px] font-semibold tracking-tight text-slate-300 transition hover:bg-white/10 sm:gap-2 sm:px-3 sm:text-sm"><Icon name="home" className="h-4 w-4 shrink-0" />Badam Classes</Link>
              <Link href="/test-rank" aria-current="page" className="flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-violet-700 to-indigo-600 px-1 text-[11px] font-bold tracking-tight text-white shadow-md shadow-violet-950/40 sm:gap-2 sm:px-3 sm:text-sm"><Icon name="chart" className="h-4 w-4 shrink-0" />BadamTestRanker</Link>
            </nav>
            <label className="flex w-full items-center gap-2 rounded-xl border border-blue-300/20 bg-[#071a33] px-3.5 py-2.5 shadow-inner shadow-blue-950/40"><Icon name="search" className="h-[18px] w-[18px] shrink-0 text-sky-300" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tests, exams and subjects" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" aria-label="Search tests and topics" /></label>
          </div>
          <div className="hidden w-full items-center justify-between gap-3 md:flex">
            <label className="flex w-full items-center gap-2 rounded-full border border-blue-400/25 bg-[#071a33] px-4 py-2.5 shadow-inner shadow-blue-950/50 md:ml-7 md:max-w-2xl"><Icon name="search" className="h-[18px] w-[18px] shrink-0 text-sky-300" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tests, exams and subjects" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" aria-label="Search tests and topics" /><kbd className="hidden rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400 sm:block">⌘ K</kbd></label>
            <div className="ml-auto flex items-center gap-3"><span className="hidden text-right sm:block"><b className="block text-xs text-white">{student?.name || "Student"}</b><small className="text-[10px] text-slate-400">Student</small></span><span className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/20 text-sm font-semibold">{student?.name?.[0]?.toUpperCase() || <Icon name="user" className="h-4 w-4" />}</span><Link href={student ? "/profile" : "/login"} className="text-slate-400" aria-label={student ? "Open profile" : "Log in"}>⌄</Link></div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 pb-24 text-slate-100 sm:p-6 lg:p-7">
          <p className="mb-4 hidden text-xs font-medium text-slate-400 sm:block"><Link href="/" className="transition hover:text-white">Home</Link><span className="mx-2 text-slate-600">/</span><span className="text-sky-200">Badam TestRank</span></p>
          <div className="grid gap-4">
            <section className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-[linear-gradient(115deg,#f7f8ff,#e9efff_65%,#e0eaff)] p-5 text-[#101b43] shadow-[0_18px_45px_rgba(4,10,35,.26)] md:hidden">
              <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-blue-400/20 blur-2xl" />
              <div className="relative flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.19em] text-indigo-700">Badam TestRank</p><h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight">Welcome, {student?.name?.split(" ")[0] || "Learner"}</h1><p className="mt-2 max-w-[225px] text-sm leading-5 text-slate-600">Attempt exam-level mock tests and build your rank with every practice session.</p></div>
                <span className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-2xl border border-blue-200 bg-white/80 text-blue-700 shadow-md shadow-blue-900/10"><Icon name="chart" className="h-11 w-11" /></span>
              </div>
              <Link href="#all-tests" className="relative mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#153ca6] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-900/20 transition hover:bg-[#0e318f]">Start practicing <span aria-hidden="true">→</span></Link>
            </section>
            <section className="relative hidden min-h-[270px] overflow-hidden rounded-2xl border border-blue-300/25 bg-[radial-gradient(ellipse_at_78%_18%,rgba(20,100,220,.42),transparent_38%),linear-gradient(110deg,#06142b,#09295c_62%,#06142b)] p-5 shadow-[0_22px_60px_rgba(0,0,0,.2)] sm:min-h-[285px] sm:p-7 md:grid xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,.7fr)] xl:items-center xl:gap-5">
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "linear-gradient(rgba(120,170,255,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(120,170,255,.15) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
              <div className="relative z-10 max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[.22em] text-sky-300">BADAM TESTRANK <span className="mx-1 text-blue-200/50">/</span> POWERED BY BADAM CLASSES</p><h1 className="mt-3 font-display text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl 2xl:text-5xl">Prepare Smart.<br /><span className="text-amber-300">Practice Better. Rank Higher.</span></h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Exam-focused mock tests and focused practice for your next step.</p><div className="mt-4 flex flex-wrap gap-2">{["SSC", "Railway", "Banking", "Police", "Defence", "& More"].map((item) => <button key={item} onClick={() => chooseExam(item === "& More" ? "All exams" : item)} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/20 bg-blue-950/40 px-3 py-1.5 text-[11px] font-semibold text-blue-50 transition hover:border-blue-200/50 hover:bg-blue-400/15"><Icon name={item === "Railway" ? "train" : item === "Banking" ? "bank" : item === "Police" || item === "Defence" ? "shield" : item === "& More" ? "spark" : "test"} className="h-3.5 w-3.5 text-sky-300" />{item}</button>)}</div><a href="#all-tests" className="mt-4 inline-flex rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-300">Explore Mock Tests <span className="ml-2">→</span></a></div>
              <div className="relative z-10 hidden rounded-2xl border border-blue-200/20 bg-[#071a36]/80 p-4 shadow-2xl shadow-blue-950/30 backdrop-blur-sm sm:block xl:ml-auto xl:w-full xl:max-w-[340px]">
                <div className="flex items-center justify-between border-b border-white/10 pb-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-300">Your practice workspace</p><p className="mt-1 text-sm font-semibold text-white">Built for exam day</p></div><span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200"><Icon name="test" className="h-5 w-5" /></span></div>
                <div className="mt-3 grid grid-cols-2 gap-2">{[{ icon: "quiz", label: "Timed mocks" }, { icon: "book", label: "Topic practice" }, { icon: "chart", label: "Score analysis" }, { icon: "spark", label: "Exam patterns" }].map((item) => <div key={item.label} className="flex items-center gap-2 rounded-lg border border-white/[.08] bg-white/[.035] px-2.5 py-2.5"><Icon name={item.icon} className="h-4 w-4 shrink-0 text-sky-300" /><span className="text-[11px] font-medium text-slate-200">{item.label}</span></div>)}</div>
                <p className="mt-3 flex items-center gap-2 text-[10px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Mocks, practice sets and previous papers in one place</p>
              </div>
            </section>
            <section className="grid gap-5 rounded-2xl border border-blue-500/35 bg-[radial-gradient(ellipse_at_12%_20%,rgba(16,102,234,.18),transparent_42%),linear-gradient(120deg,#031a43,#05245a_58%,#031633)] p-5 shadow-[0_24px_65px_rgba(0,0,0,.2)] sm:grid-cols-[minmax(0,1.2fr)_minmax(250px,.8fr)] sm:items-center sm:p-6"><div className="flex min-w-0 items-center gap-4 sm:gap-6"><div className="grid h-24 w-24 shrink-0 place-items-center rounded-full p-[6px] sm:h-28 sm:w-28" style={{ background: `conic-gradient(#1687ff ${completionProgress}%,#0c3978 0)` }}><div className="grid h-full w-full place-items-center rounded-full bg-[#06204a] text-2xl font-bold text-white">{historyLoading ? "…" : `${completionProgress}%`}</div></div><div className="hidden h-20 w-px shrink-0 bg-blue-400/25 sm:block" /><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.15em] text-blue-200">Overall Progress</p><h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">Completed practice</h2><p className="mt-1.5 text-2xl font-bold text-cyan-300">{historyLoading ? "…" : history.length}<span className="ml-2 text-base font-semibold text-white">attempts</span></p><p className="mt-1 text-xs leading-5 text-blue-200">{loading ? "Loading available tests…" : `Out of ${tests.length} available tests`} · Keep practicing to improve your performance.</p></div></div><div className="flex min-h-28 items-center gap-4 rounded-xl border border-blue-400/25 bg-blue-900/25 p-4 sm:p-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-500/20 text-cyan-300"><svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8m-4-4v4M7 4H4v2a5 5 0 0 0 4.3 5M17 4h3v2a5 5 0 0 1-4.3 5M7 3h10v7a5 5 0 0 1-10 0z"/><path d="m12 5 1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L9 7.3 11 7z"/></svg></span><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-blue-200">Best saved score</p><p className="mt-1.5 text-2xl font-bold text-white">{historyLoading ? "…" : best === null ? "—" : `${best}%`}</p><p className="mt-1 text-[11px] text-blue-200">Highest score across submitted tests</p></div></div></section>
          </div>

          <section aria-label="Choose a test format" className="mt-5 md:hidden">
            <div className="mb-3 flex items-end justify-between gap-2">
              <div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-sky-300">Quick access</p><h2 className="mt-1 text-base font-bold text-white">Choose your test</h2></div>
              <span className="pb-0.5 text-[10px] font-medium text-slate-400">Pick a format <span aria-hidden="true">→</span></span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { title: "Live Test", detail: `${tests.filter((item) => item.source === "Verified online test").length} timed tests`, label: "TIMED", action: "Start", icon: "live", tone: "border-rose-300/35 from-[#321326] via-[#1b1832] to-[#0c1930] text-rose-100", iconTone: "bg-rose-400/15 text-rose-200", href: "/test-rank?mode=timed#all-tests" },
                { title: "Class Test", detail: `${tests.filter((item) => item.access === "Free").length} practice sets`, label: "FREE", action: "Practice", icon: "book", tone: "border-emerald-300/35 from-[#0b302d] via-[#0b2530] to-[#0b1930] text-emerald-100", iconTone: "bg-emerald-400/15 text-emerald-200", href: "/mock-tests/free-practice" },
                { title: "Test Series", detail: `${tests.length} tests · all exams`, label: "EXAM SERIES", action: "Browse", icon: "test", tone: "border-blue-300/35 from-[#102e61] via-[#101f43] to-[#0b1930] text-blue-100", iconTone: "bg-blue-400/15 text-blue-200", href: "#all-tests" }
              ].map((item) => <Link key={item.title} href={item.href} aria-label={`${item.title}: ${item.detail}. ${item.action} now`} className={`group relative flex min-h-[160px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-2.5 shadow-[0_12px_24px_rgba(0,0,0,.22)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(0,0,0,.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#030d1b] motion-reduce:transform-none motion-reduce:transition-none ${item.tone}`}>
                <span aria-hidden="true" className="pointer-events-none absolute -right-7 -top-8 h-20 w-20 rounded-full bg-white/[.07] blur-xl" />
                <span className="relative flex items-start justify-between gap-1"><span className={`grid h-10 w-10 place-items-center rounded-xl border border-white/10 ${item.iconTone}`}><Icon name={item.icon} className="h-5 w-5" /></span><span className="rounded-full border border-white/10 bg-black/15 px-1.5 py-1 text-[7px] font-bold tracking-[.08em] text-white/80">{item.label}</span></span>
                <span className="relative block min-w-0"><b className="block text-[12px] font-bold leading-4 text-white">{item.title}</b><small className="mt-1 block text-[9px] leading-3 text-slate-300">{item.detail}</small><span className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[9px] font-bold text-white/90"><span>{item.action}</span><span aria-hidden="true" className="text-sm transition-transform group-hover:translate-x-0.5">→</span></span></span>
              </Link>)}
            </div>
          </section>
          <section className="relative mt-4 overflow-hidden rounded-2xl border border-blue-300/20 bg-[linear-gradient(115deg,#102f85,#143caa_62%,#0b245f)] p-5 text-white shadow-[0_18px_45px_rgba(7,25,83,.28)] md:hidden">
            <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-cyan-300/15 blur-2xl" />
            <div className="relative flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-amber-200"><Icon name="school" className="h-6 w-6" /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-200">Your preparation plan</p><h2 className="mt-1 text-lg font-bold">Build a stronger daily routine</h2><p className="mt-1 text-xs leading-5 text-blue-100/80">Practice topic-wise, follow current affairs and keep your exam goals on track.</p></div></div>
            <div className="relative mt-4 flex flex-wrap gap-2"><Link href="/mock-tests" className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15">Daily Quiz</Link><Link href="/current-affairs" className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15">Current Affairs</Link><Link href="/courses" className="ml-auto rounded-full bg-white px-3.5 py-2 text-xs font-bold text-blue-950 transition hover:bg-blue-50">Explore courses →</Link></div>
          </section>
          <div className="mt-5 hidden grid-cols-1 gap-3 sm:grid-cols-2 md:grid 2xl:grid-cols-4">{[{ title: "Take a Mock Test", subtitle: "Real exam practice", href: "#all-tests", icon: "test", tone: "blue" }, { title: "Daily Quiz", subtitle: "Boost your knowledge", href: "/mock-tests", icon: "quiz", tone: "green" }, { title: "Current Affairs", subtitle: "Today's important news", href: "/current-affairs", icon: "news", tone: "violet" }, { title: "Browse Courses", subtitle: "Explore learning batches", href: "/courses", icon: "course", tone: "amber" }].map((item) => <Link key={item.title} href={item.href} className={`group relative flex min-h-[145px] flex-col justify-between overflow-hidden rounded-2xl border p-4 shadow-lg transition duration-200 hover:-translate-y-0.5 sm:min-h-[160px] sm:p-5 ${item.tone === "blue" ? "border-blue-500/65 bg-[linear-gradient(145deg,rgba(7,48,112,.72),rgba(5,27,67,.96))] text-blue-300 hover:border-blue-400" : item.tone === "green" ? "border-teal-500/60 bg-[linear-gradient(145deg,rgba(0,75,79,.64),rgba(3,35,48,.96))] text-teal-300 hover:border-teal-400" : item.tone === "violet" ? "border-violet-500/60 bg-[linear-gradient(145deg,rgba(49,35,123,.68),rgba(24,20,71,.96))] text-violet-300 hover:border-violet-400" : "border-amber-500/60 bg-[linear-gradient(145deg,rgba(91,57,20,.62),rgba(30,31,40,.96))] text-amber-300 hover:border-amber-400"}`}><span className={`pointer-events-none absolute -bottom-16 -right-8 h-32 w-2/3 rotate-[-32deg] opacity-30 transition group-hover:opacity-50 ${item.tone === "blue" ? "bg-blue-600" : item.tone === "green" ? "bg-teal-500" : item.tone === "violet" ? "bg-violet-600" : "bg-amber-500"}`} /><span className="relative z-10 flex w-full items-start justify-between"><span className={`grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[.08] text-white shadow-inner sm:h-14 sm:w-14 ${item.tone === "blue" ? "shadow-blue-500/20" : item.tone === "green" ? "shadow-teal-500/20" : item.tone === "violet" ? "shadow-violet-500/20" : "shadow-amber-500/20"}`}><Icon name={item.icon} className="h-6 w-6 sm:h-7 sm:w-7" /></span><span className="grid h-9 w-9 place-items-center rounded-full bg-black/20 text-2xl text-white/90 transition group-hover:translate-x-1">→</span></span><span className="relative z-10"><b className="block text-lg font-bold tracking-tight text-white sm:text-xl">{item.title}</b><small className="mt-1 block text-sm text-slate-300">{item.subtitle}</small></span></Link>)}</div>

          <section className="mt-7"><div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-300">Learning center</p><h2 className="mt-1 text-xl font-bold tracking-tight text-white">Popular Exam Categories</h2></div><a href="#all-tests" className="text-xs font-semibold text-sky-300 hover:text-white">View all mock tests →</a></div><div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{mockExamCategories.map((group) => <article key={group.exam} className="overflow-hidden rounded-2xl border border-white/[.1] bg-[linear-gradient(145deg,#0c1c3b,#07142a)] p-4 shadow-[0_16px_38px_rgba(0,0,0,.16)] transition hover:-translate-y-0.5 hover:border-blue-300/35 sm:p-5">{group.logoImage ? <div className="mb-4 flex h-24 items-center justify-center overflow-hidden rounded-xl border border-blue-200/10 bg-[radial-gradient(ellipse_at_center,rgba(30,86,160,.22),rgba(5,18,38,.4))] p-2"><Image src={group.logoImage} alt={group.logoAlt || `${group.exam} mock tests`} width={480} height={260} className="h-full w-auto max-w-full rounded-lg bg-white object-contain px-2" /></div> : null}<div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-orange-300/25 bg-orange-500/10 text-orange-100"><Icon name={categoryIconNames[group.exam] || "test"} className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-orange-300">{group.exam}</p><h3 className="mt-1 text-2xl font-bold tracking-tight text-white">{group.totalTests} Tests</h3></div></div><span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold text-cyan-100">{group.difficulty}</span></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300"><span className="rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-2">Free: <b className="text-white">{group.freeTests}</b></span><span className="rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-2">Paid: <b className="text-white">{group.paidTests}</b></span><span className="rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-2">Avg: {group.duration}</span><span className="rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-2">{group.pattern}</span></div><p className="mt-3 text-xs text-slate-400">{group.sections}</p><div className="mt-4 grid grid-cols-2 gap-2">{group.subExams?.map((subExam) => <button key={subExam.name} onClick={() => setExam(subExam.name)} className="flex min-w-0 items-center gap-2 rounded-lg border border-cyan-300/15 bg-cyan-400/[.07] px-2.5 py-2 text-left text-xs font-semibold text-cyan-50 transition hover:border-cyan-200/35 hover:bg-cyan-400/15"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-orange-300/20 bg-orange-500/10 text-orange-100"><Icon name={subExamIconName(subExam.name, group.exam)} className="h-4 w-4" /></span><span className="truncate">{subExam.name}</span></button>)}</div><Link href={`/test-rank?exam=${encodeURIComponent(group.exam)}&mode=full#all-tests`} className="mt-4 inline-flex items-center rounded-lg bg-gradient-to-r from-orange-400 via-orange-500 to-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:brightness-110">Open {group.exam} Mock <span className="ml-2">→</span></Link></article>)}</div></section>

          <div className="mt-4 grid items-start gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(310px,.75fr)]">
            <section id="all-tests" className="min-w-0 rounded-xl border border-sky-400/20 bg-[#041326] p-4 sm:p-5">
              <div className="mb-5">
                <div className="mb-3"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Choose your practice</p><h2 className="mt-1 text-lg font-bold text-white">Find the right test for you</h2></div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
                  {[
                    { id: "free", title: "Free Mock Tests", detail: "Practice without payment", icon: "quiz", tone: "emerald" },
                    { id: "pyq", title: "Previous Year Questions", detail: "Questions from past exams", icon: "paper", tone: "cyan" },
                    { id: "timed", title: "Live Mock Tests", detail: "Timed verified online tests", icon: "live", tone: "blue" },
                    { id: "premium", title: "Premium Mock Tests", detail: "Paid test series", icon: "school", tone: "amber" },
                    { id: "ranking", title: "Test Ranking & Leaderboard", detail: "Scores & test-wise performance", icon: "chart", tone: "violet" }
                  ].map((item) => {
                    const content = <><span className={`grid h-9 w-9 place-items-center rounded-xl ${item.tone === "emerald" ? "bg-emerald-400/10 text-emerald-200" : item.tone === "cyan" ? "bg-cyan-400/10 text-cyan-200" : item.tone === "blue" ? "bg-blue-400/10 text-blue-200" : item.tone === "amber" ? "bg-amber-400/10 text-amber-200" : "bg-violet-400/10 text-violet-200"}`}><Icon name={item.icon} className="h-5 w-5" /></span><span className="mt-3 block text-[12px] font-bold leading-4 text-white sm:text-[13px]">{item.title}</span><span className="mt-1 block text-[10px] leading-4 text-slate-400">{item.detail}</span></>;
                    const cardClass = "group min-h-[116px] rounded-xl border border-white/10 bg-[#081a32] p-3 text-left transition-[transform,border-color,background-color] duration-200 hover:border-blue-300/35 hover:bg-[#0b2040] motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";
                    if (item.id === "ranking") return <Link key={item.id} href="#my-performance" aria-label="View your performance and test ranking; leaderboards are available from submitted test results" className={cardClass}>{content}</Link>;
                    return <button key={item.id} type="button" className={cardClass} onClick={() => { setExam("All exams"); setSubExam(""); setSubject("All subjects"); if (item.id === "free") { setTab("Free Tests"); setMockMode("all"); } else if (item.id === "pyq") { setTab("Previous Year Papers"); setMockMode("all"); } else if (item.id === "timed") { setTab("All Tests"); setMockMode("timed"); } else { setTab("Premium Tests"); setMockMode("all"); } const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"; window.setTimeout(() => document.getElementById("test-filters")?.scrollIntoView({ block: "center", behavior }), 0); }}>{content}</button>;
                  })}
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-blue-300">Test library</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">All Mock Tests</h2><p className="mt-1 text-xs text-slate-400">{loading ? "Loading published tests…" : `${filteredTests.length} tests and practice sets`}</p></div><div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2"><FilterSelect label="Exam" value={exam} onChange={chooseExam} options={["All exams", ...exams]} /><FilterSelect label="Subject" value={subject} onChange={setSubject} options={["All subjects", ...subjects]} /><FilterSelect label="Difficulty" value={difficulty} onChange={setDifficulty} options={["All levels", ...new Set(tests.map((item) => item.difficulty))]} /><FilterSelect label="Language" value={language} onChange={setLanguage} options={["All languages", ...new Set(tests.map((item) => item.language))]} /></div></div>
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#07152c] p-2 sm:grid-cols-3 xl:grid-cols-5">{mockModes.map((mode) => <button key={mode.id} type="button" onClick={() => { setMockMode(mode.id); setTab("All Tests"); }} aria-pressed={mockMode === mode.id} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition sm:text-sm ${mockMode === mode.id ? "border-orange-300/40 bg-orange-500/15 text-orange-100 shadow-lg shadow-orange-950/10" : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[.04]"}`}><Icon name={mode.icon} className="h-4 w-4 shrink-0" />{mode.label}</button>)}</div>
              {selectedCategory?.subExams?.length ? <div className="mb-4 flex gap-2 overflow-x-auto pb-2">{[{ name: `All ${exam}` }, ...selectedCategory.subExams].map((item) => { const active = item.name === `All ${exam}` ? !subExam : subExam === item.name; return <button key={item.name} type="button" onClick={() => setSubExam(item.name === `All ${exam}` ? "" : item.name)} aria-pressed={active} className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${active ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-50" : "border-white/10 bg-white/[.03] text-slate-300 hover:border-cyan-300/25"}`}><Icon name={item.name === `All ${exam}` ? "grid" : subExamIconName(item.name, exam)} className="h-4 w-4 shrink-0" />{item.name}</button>; })}</div> : null}
              <div id="test-filters" className="mb-4 flex scroll-mt-24 gap-2 overflow-x-auto pb-2">{tabs.map((name) => <button key={name} onClick={() => setTab(name)} aria-pressed={tab === name} className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition ${tab === name ? "border-blue-300/50 bg-blue-500/20 text-blue-100" : "border-white/10 bg-white/[.03] text-slate-300 hover:bg-white/[.08]"}`}>{name}</button>)}</div>
              {error && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100"><span>{error}</span><button onClick={loadTests} className="rounded-lg border border-amber-200/30 px-3 py-2 font-semibold">Retry</button></div>}
              {loading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-48 animate-pulse rounded-xl border border-white/10 bg-white/[.04]" />)}</div> : filteredTests.length ? <div className="grid gap-3 md:grid-cols-2">{filteredTests.slice(0, pageSize).map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-[#07172e] p-4 transition hover:border-blue-300/30"><div className="flex items-start justify-between gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold ${item.access === "Premium" ? "border-amber-300/20 bg-amber-400/10 text-amber-100" : "border-blue-300/20 bg-blue-400/10 text-blue-100"}`}><Icon name={item.access === "Premium" ? "school" : "check"} className="h-3.5 w-3.5" />{item.access}</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.06] px-2.5 py-1 text-[10px] text-slate-300"><Icon name="paper" className="h-3.5 w-3.5" />{item.type}</span></div><h3 className="mt-3 text-base font-bold text-white">{item.title}</h3><p className="mt-1 text-xs text-slate-400">{item.exam}</p><div className="mt-4 grid grid-cols-3 gap-2 text-[11px]"><Detail icon="paper" label="Questions" value={item.questionCount || "—"} /><Detail icon="clock" label="Duration" value={item.duration} /><Detail icon="spark" label="Difficulty" value={item.difficulty} /></div><div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3"><span className="truncate text-[10px] text-slate-500">{item.source}</span><Link href={item.href} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-blue-400">{item.access === "Premium" ? "Unlock Test" : "Start Test"}<Icon name="arrow" className="h-3.5 w-3.5" /></Link></div></article>)}</div> : <div className="rounded-xl border border-dashed border-white/15 p-8 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-blue-300/20 bg-blue-400/10 text-blue-200"><Icon name={mockMode === "timed" ? "clock" : "search"} className="h-6 w-6" /></span><p className="mt-3 font-semibold text-white">{mockMode === "timed" ? "No timed online tests are published yet" : "No tests match these filters"}</p><p className="mt-2 text-sm text-slate-400">{mockMode === "timed" ? "Check back when a verified online mock is available." : "Try another exam or search term."}</p></div>}
              {!loading && filteredTests.length > pageSize && <button onClick={() => setPageSize((size) => size + 12)} className="mx-auto mt-5 block rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-blue-300/40">Load more tests</button>}
          <p className="mt-4 text-[10px] leading-5 text-slate-500">Published tests, PDF question-bank sets, online MCQs and built-in practice mocks are collected here. Published online tests use timed server-scored attempts and verified results.</p>
            </section>

            <aside className="grid content-start gap-4"><section className="rounded-xl border border-sky-400/20 bg-[#041326] p-4"><div className="flex items-center justify-between"><h2 className="font-bold text-white">Upcoming Tests</h2><a href="#all-tests" className="text-xs text-sky-300">View all →</a></div><div className="mt-3 rounded-lg border border-white/10 bg-white/[.025] p-4 text-center"><p className="text-sm font-medium text-slate-200">No scheduled tests available</p><p className="mt-1 text-xs text-slate-500">Published practice sets appear in All Mock Tests.</p></div></section><section id="my-performance" className="rounded-xl border border-sky-400/20 bg-[#041326] p-4"><div className="flex items-center justify-between"><h2 className="font-bold text-white">Performance Overview</h2><span className="text-[10px] text-slate-500">Verified submissions</span></div>{history.length ? <><div className="mt-5 flex h-32 items-end gap-2 border-b border-l border-white/10 px-2">{history.slice(-8).map((item, index) => <div key={item.id || index} className="flex-1 rounded-t bg-gradient-to-t from-blue-700 to-cyan-400" style={{ height: `${Math.max(8, Math.min(100, Number(item.percent) || 0))}%` }} title={`${item.percent}% accuracy`} />)}</div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><SmallStat label="Attempts" value={history.length} /><SmallStat label="Average accuracy" value={`${average}%`} /><SmallStat label="Best score" value={`${best}%`} /><SmallStat label="Avg seconds / question" value={`${averageTimePerQuestion ?? "—"}s`} /></div></> : <div className="mt-4 rounded-lg border border-dashed border-white/10 p-5 text-center"><p className="text-sm text-slate-300">Your verified performance appears here</p><p className="mt-1 text-xs text-slate-500">Complete a published online test while logged in.</p></div>}</section><section className="rounded-xl border border-amber-300/20 bg-[linear-gradient(115deg,#211a0a,#11192b_65%,#0b2343)] p-5"><p className="text-xs font-bold uppercase tracking-wide text-amber-300">♛ Badam Classes</p><h2 className="mt-2 text-xl font-bold text-white">Build your exam plan</h2><p className="mt-2 text-xs leading-5 text-slate-300">Explore structured lessons, practice materials and live classes.</p><Link href="/courses" className="mt-4 inline-flex rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950">Explore Courses →</Link></section></aside>
          </div>
          <footer className="mt-8 border-t border-white/10 py-5 text-center text-xs text-slate-500">BADAM TESTRANK — Powered by Badam Classes</footer>
        </main>
      </div>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-sky-400/20 bg-[#020b18]/95 px-2 py-2 backdrop-blur md:hidden">{[{ label: "Home", href: "/", icon: "home" }, { label: "Courses", href: "/courses", icon: "course" }, { label: "Tests", href: "/test-rank", icon: "test" }, { label: "News", href: "/current-affairs", icon: "news" }, { label: "Profile", href: "/profile", icon: "user" }].map((item) => <Link key={item.label} href={item.href} aria-current={item.label === "Tests" ? "page" : undefined} className={`grid justify-items-center gap-1 text-[10px] font-medium ${item.label === "Tests" ? "text-sky-300" : "text-slate-400"}`}><Icon name={item.icon} className="h-4 w-4" />{item.label}</Link>)}</nav>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#07172e] px-3 py-2 text-[10px] text-slate-400">{label}<select value={value} onChange={(event) => onChange(event.target.value)} aria-label={`Filter by ${label}`} className="min-w-0 bg-transparent text-xs font-medium text-slate-100 outline-none">{options.map((option) => <option className="bg-[#07172e]" key={option}>{option}</option>)}</select></label>;
}
function Detail({ icon, label, value }) { return <div className="rounded-lg bg-white/[.04] p-2.5"><p className="flex items-center gap-1.5 text-[9px] uppercase tracking-wide text-slate-500"><Icon name={icon} className="h-3.5 w-3.5" />{label}</p><p className="mt-1 font-semibold text-slate-200">{value}</p></div>; }
function SmallStat({ label, value }) { return <div className="rounded-lg border border-white/10 bg-white/[.03] p-2"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></div>; }
