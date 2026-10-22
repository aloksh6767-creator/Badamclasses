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
const mockModes = [{ id: "all", label: "All Mocks", icon: "grid" }, { id: "full", label: "Full Mock", icon: "test" }, { id: "sectional", label: "Sectional Mock", icon: "layers" }, { id: "topic", label: "Topic / Chapter Mock", icon: "book" }, { id: "mini", label: "Mini Mocks", icon: "spark" }, { id: "super", label: "Super Sets", icon: "spark" }, { id: "calci", label: "Ultra Calci", icon: "calculator" }, { id: "timed", label: "Timed Online Tests", icon: "clock" }];
const practiceFormats = [
  { id: "full", title: "Full Length Tests", detail: "Attempt realistic exam simulations and see where you stand.", icon: "test", badge: "EXAM MODE", tone: "blue" },
  { id: "pyq", title: "PYQs", detail: "Practice previous exam questions and understand real trends.", icon: "paper", badge: "PAST PAPERS", tone: "emerald" },
  { id: "super", title: "Super Set Tests", detail: "Curated mixed practice sets for a focused challenge.", icon: "spark", badge: "FEATURED", tone: "violet" },
  { id: "calci", title: "Ultra Calci Tests", detail: "Sharpen calculation speed with short timed drills.", icon: "calculator", badge: "QUICK DRILL", tone: "amber" },
  { id: "sectional", title: "Sectional Tests", detail: "Build confidence one subject at a time.", icon: "layers", badge: "BY SUBJECT", tone: "cyan" },
  { id: "topic", title: "Topic Boost", detail: "Strengthen specific chapters with step-by-step practice.", icon: "book", badge: "TOPIC WISE", tone: "rose" }
];
const examTerms = { Railway: ["railway", "rrb", "ntpc", "alp", "technician", "rpf", "railway je", "rrb je"], SSC: ["ssc", "cgl", "mts", "chsl", "cpo", "steno"], Banking: ["bank", "ibps", "sbi", "rbi", "po", "clerk"], Police: ["police", "constable", "rpf"], Teaching: ["teaching", "tet", "ctet", "uptet"], "State Exams": ["state", "psc", "up exams", "mp exams", "bihar"] };
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
  const accessText = String(item.accessType || item.access || "");
  const access = /paid|premium/i.test(accessText) ? "Premium" : /free/i.test(accessText) ? "Free" : "Access not specified";
  const exam = item.examName || item.exam || item.category || "Mixed Practice";
  const testType = /pyq|previous year/i.test(`${item.type || ""} ${item.title || ""} ${item.source || ""}`)
    ? "Previous Year Papers"
    : /section|topic|mini|drill/i.test(`${item.examMode || ""} ${item.type || ""} ${item.mockType || ""}`)
      ? "Sectional Tests"
      : /full[-\s]?length|full mock|complete mock|full test/i.test(`${item.examMode || ""} ${item.type || ""} ${item.title || ""}`)
        ? "Full-Length Tests" : "Practice Sets";
  return {
    id, title: item.title || "Practice set", exam, questionCount,
    examSearchText: [item.examName, item.exam, item.category, item.source, item.sourcePdf, item.title].filter(Boolean).join(" "),
    duration: item.duration || (item.durationMinutes ? `${item.durationMinutes} min` : "—"), marks: item.marks || item.maxMarks || (item.marksPerQuestion != null ? questionCount * Number(item.marksPerQuestion) : "—"), difficulty: item.difficulty || "Not specified",
    language: item.language || "Not specified", access, type: item.testRankType || testType, source: sourceLabel,
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
  const text = ` ${`${item.examSearchText || ""} ${item.exam} ${item.title}`.toLowerCase().replace(/[_-]+/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
  const matchesTerm = (term) => text.includes(` ${term.toLowerCase()} `);
  if (examTerms[selected]) return examTerms[selected].some(matchesTerm);
  return matchesTerm(selected);
};

const mainLinks = [
  { label: "Dashboard", href: "/dashboard", icon: "home", section: "Overview" },
  { label: "My Courses", href: "/dashboard", icon: "book", section: "Overview" },
  { label: "Mock Tests", href: "/test-rank", icon: "test", active: true, section: "Test Library" },
  { label: "Daily Quiz", href: "/mock-tests", icon: "quiz", badge: "NEW", section: "Test Library" },
  { label: "Previous Year Papers", href: "/mock-tests", icon: "paper", section: "Test Library" },
  { label: "Current Affairs", href: "/current-affairs", icon: "news", section: "Study Library" },
  { label: "Study Material", href: "/class-pdfs", icon: "book", section: "Study Library" },
  { label: "Performance", href: "/test-rank#my-performance", icon: "chart", section: "Your Progress" },
  { label: "My Profile", href: "/profile", icon: "user", section: "Your Progress" }
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
    crown: <><path d="m3 8 4.5 4 4.5-7 4.5 7L21 8l-2 11H5L3 8Z"/><path d="M7 22h10"/></>,
    payment: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></>,
    calculator: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 3h2m4 0h2"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>
  };
  return <svg {...shared}>{paths[name] || paths.test}</svg>;
}

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
  const [sortBy, setSortBy] = useState("Recommended");
  const [pageSize, setPageSize] = useState(12);
  const [expandedExam, setExpandedExam] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [directExamView, setDirectExamView] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;
    const mobileViewport = window.matchMedia("(max-width: 767px)");
    if (!mobileViewport.matches) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };
    const closeOnDesktopResize = (event) => {
      if (!event.matches) setMobileSidebarOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    mobileViewport.addEventListener("change", closeOnDesktopResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      mobileViewport.removeEventListener("change", closeOnDesktopResize);
    };
  }, [mobileSidebarOpen]);
  useEffect(() => {
    const selectedExam = subExam || (exam === "All exams" ? "Competitive Exam" : exam);
    document.title = `${selectedExam} Mock Tests | Badam TestRank`;
  }, [exam, subExam]);
  const updateLibraryUrl = (updates, hash = "#test-library") => { const params = new URLSearchParams(window.location.search); Object.entries(updates).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key)); window.history.pushState(null, "", `/test-rank${params.size ? `?${params.toString()}` : ""}${hash}`); };
  const chooseExam = (value) => { setExam(value); setSubExam(""); setDirectExamView(value !== "All exams"); setShowLibrary(true); updateLibraryUrl({ exam: value === "All exams" ? "" : value, subExam: "" }); };
  const openCategoryMocks = (category, selectedSubExam = "") => {
    setExam(category);
    setSubExam(selectedSubExam);
    setTab("All Tests");
    setMockMode("all");
    setSubject("All subjects");
    setDifficulty("All levels");
    setLanguage("All languages");
    setSearch("");
    // Keep the selected exam's results inside its category card so the page
    // expands in place instead of opening a second library elsewhere.
    const selectedPanel = selectedSubExam || category;
    setExpandedExam(selectedPanel);
    setSelectedFormat("");
    setDirectExamView(false);
    setShowLibrary(false);
    setPageSize(12);
    const params = new URLSearchParams({ exam: category });
    if (selectedSubExam) params.set("subExam", selectedSubExam);
    window.history.pushState(null, "", `/test-rank?${params.toString()}#popular-exams`);
  };
  const selectFormat = (format) => {
    setSelectedFormat((current) => current === format ? "" : format);
    setDirectExamView(false);
    setExam("All exams"); setSubExam(""); setSubject("All subjects"); setDifficulty("All levels"); setLanguage("All languages"); setSearch(""); setExpandedExam(""); setShowLibrary(false); setPageSize(5);
    if (format === "pyq") { setTab("Previous Year Papers"); setMockMode("all"); }
    else { setTab("All Tests"); setMockMode(format); }
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.setTimeout(() => document.getElementById("all-tests")?.scrollIntoView({ block: "start", behavior }), 0);
  };
  const selectQuickTest = (kind) => {
    setDirectExamView(false);
    setExam("All exams"); setSubExam(""); setSubject("All subjects"); setDifficulty("All levels"); setLanguage("All languages"); setSearch(""); setShowLibrary(true); setPageSize(12);
    if (kind === "free") { setTab("Free Tests"); setMockMode("all"); }
    else if (kind === "pyq") { setTab("Previous Year Papers"); setMockMode("all"); }
    else if (kind === "timed") { setTab("All Tests"); setMockMode("timed"); }
    else { setTab("Premium Tests"); setMockMode("all"); }
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.setTimeout(() => document.getElementById("all-tests")?.scrollIntoView({ block: "center", behavior }), 0);
  };

  const loadTests = async () => {
    setLoading(true);
    setError("");
    const workspace = readAdminWorkspace();
    const localTests = Array.isArray(workspace.mockTests)
      ? workspace.mockTests.filter((item) => item?.status === "published" && item?.reviewStatus !== "pending" && item?.pipelineStage !== "Admin Review")
        .map((item) => normalizeTest(item, "Published mock")) : [];
    const [mcqResult, pdfResult, bankResult] = await Promise.allSettled([
      apiFetch("/automation/public-mcqs?limit=100"),
      apiFetch("/automation/public-pdf-mocks"),
      fetch("/mock-pdfs/mock-question-bank.json").then((response) => {
        if (!response.ok) throw new Error("Question bank is unavailable.");
        return response.json();
      })
    ]);
    const mcqTests = mcqResult.status === "fulfilled" && Array.isArray(mcqResult.value?.mcqSets)
      ? mcqResult.value.mcqSets.map((item) => normalizeTest({ ...item, href: `/test/${encodeURIComponent(item._id || item.id)}` }, "Verified online test")) : [];
    const pdfSourceTests = pdfResult.status === "fulfilled" && Array.isArray(pdfResult.value?.mockTests)
      ? enrichMockTests(pdfResult.value.mockTests) : [];
    const pdfTests = pdfSourceTests.map((item) => normalizeTest(item, "Published PDF question set"));
    const chapterTests = buildChapterTests(pdfSourceTests);
    const questionBankTests = bankResult.status === "fulfilled" && Array.isArray(bankResult.value)
      ? enrichMockTests(bankResult.value).map((item) => normalizeTest({
          ...item,
          examName: item.examName || item.category,
          testRankType: item.mockType === "topic"
            ? "Topic / Chapter Mock"
            : item.subject && item.subject !== "Mixed Practice"
              ? "Sectional Tests"
              : "Practice Sets",
          href: buildPracticeHref(item.examName || item.category, item.id, item.subject || "")
        }, "Published question bank")) : [];
    if (mcqResult.status === "rejected" && pdfResult.status === "rejected") {
      setError("Live test lists are unavailable. Showing locally available published tests and practice sets.");
    }
    const allTests = [...localTests, ...pdfTests, ...chapterTests, ...mcqTests, ...questionBankTests, ...topicWiseAiMocks.map((item) => normalizeTest({ ...item, testRankType: /topic/i.test(`${item.examMode || ""} ${item.type || ""}`) ? "Topic / Chapter Mock" : item.testRankType }, "Badam Classes practice"))];
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
    const syncLocationState = () => {
      const params = new URLSearchParams(window.location.search);
      const requestedExam = params.get("exam");
      const requestedMode = params.get("mode");
      const requestedTab = params.get("tab");
      const requestedSubExam = params.get("subExam");
      const matchedCategory = mockExamCategories.find((category) => category.exam === requestedExam || category.subExams?.some((item) => item.name === requestedSubExam));
      const validExam = requestedExam && (requestedExam === "All exams" || mockExamCategories.some((category) => category.exam === requestedExam));
      const inlineCategoryView = window.location.hash === "#popular-exams" && Boolean(matchedCategory);
      setExam(inlineCategoryView ? matchedCategory.exam : validExam ? requestedExam : "All exams");
      setSubExam(matchedCategory?.subExams?.some((item) => item.name === requestedSubExam) ? requestedSubExam : "");
      setExpandedExam(inlineCategoryView ? requestedSubExam || matchedCategory.exam : "");
      setDirectExamView(Boolean((requestedExam || requestedSubExam) && !inlineCategoryView));
      setMockMode(mockModes.some((mode) => mode.id === requestedMode) ? requestedMode : "all");
      setTab(tabs.includes(requestedTab) ? requestedTab : "All Tests");
      setShowLibrary(!inlineCategoryView && Boolean(requestedExam || requestedMode || requestedTab || requestedSubExam));
      if (!inlineCategoryView && (requestedExam || requestedMode || requestedTab || requestedSubExam)) {
        window.setTimeout(() => document.getElementById("test-library")?.scrollIntoView({ block: "start", behavior: "smooth" }), 100);
      }
    };
    syncLocationState();
    window.addEventListener("popstate", syncLocationState);
    setStudent(getUser());
    if (getToken()) {
      apiFetch("/test-rank/attempts").then((data) => {
        setHistory((data.attempts || []).filter((item) => item.status === "submitted" && item.result).map((item) => ({ id: item.id, title: item.title, percent: Number(item.result.accuracy || 0), scorePercent: item.result.maxMarks ? Math.round((item.result.score / item.result.maxMarks) * 100) : 0, questionCount: item.questionCount || 0, result: item.result })));
      }).catch(() => setHistory([])).finally(() => setHistoryLoading(false));
    } else { setHistory([]); setHistoryLoading(false); }
    loadTests();
    return () => window.removeEventListener("popstate", syncLocationState);
  }, []);

  const subjects = useMemo(() => [...new Set(tests.map((item) => item.subject).filter(Boolean))].sort(), [tests]);
  const exams = useMemo(() => {
    const supportedCategoryNames = mockExamCategories.flatMap((category) => {
      const supportedSubExams = (category.subExams || []).filter((subExam) => tests.some((item) => matchesExam(item, subExam.name))).map((subExam) => subExam.name);
      return [category.exam, ...supportedSubExams].filter((name) => tests.some((item) => matchesExam(item, name)));
    });
    return [...new Set([...supportedCategoryNames, ...tests.map((item) => item.exam)])].sort();
  }, [tests]);
  const selectedCategory = mockExamCategories.find((item) => item.exam === exam);
  const supportedSelectedSubExams = (selectedCategory?.subExams || []).filter((item) => tests.some((test) => matchesExam(test, item.name)));
  const filteredTests = useMemo(() => tests.filter((item) => {
    const searchable = `${item.title} ${item.exam} ${item.source} ${item.subject}`.toLowerCase();
    const modeText = `${item.title} ${item.type} ${item.exam || ""} ${item.examMode || ""} ${item.subject || ""}`.toLowerCase();
    const matchesTab = tab === "All Tests"
      || tab === `${item.access} Tests`
      || (tab === "Previous Year Papers" && /pyq|previous year|past paper/i.test(`${modeText} ${item.source}`))
      || tab === item.type;
    const matchesMode = mockMode === "all"
      || (mockMode === "timed" && item.source === "Verified online test")
      || (mockMode === "full" && item.type === "Full-Length Tests")
      || (mockMode === "sectional" && item.type === "Sectional Tests" && !/topic|chapter/i.test(modeText))
      || (mockMode === "topic" && item.type === "Topic / Chapter Mock")
      || (mockMode === "mini" && item.questionCount > 0 && item.questionCount <= 30)
      || (mockMode === "super" && /super[\s-]*set/i.test(modeText))
      || (mockMode === "calci" && /ultra\s*calci|calculat|arithmetic drill/i.test(modeText));
    return matchesTab && matchesMode && matchesExam(item, exam)
      && (!subExam || matchesExam(item, subExam))
      && (subject === "All subjects" || item.subject === subject)
      && (difficulty === "All levels" || item.difficulty === difficulty)
      && (language === "All languages" || item.language.includes(language))
      && searchable.includes(search.toLowerCase());
  }), [tests, tab, mockMode, exam, subExam, subject, difficulty, language, search]);
  const sortedTests = useMemo(() => {
    const durationMinutes = (value) => {
      const exactDuration = /^(\d+(?:\.\d+)?)\s*min$/i.exec(String(value).trim());
      return exactDuration ? Number(exactDuration[1]) : Number.POSITIVE_INFINITY;
    };
    return [...filteredTests].sort((a, b) => {
      if (sortBy === "Most questions") return b.questionCount - a.questionCount || a.title.localeCompare(b.title);
      if (sortBy === "Shortest duration") return durationMinutes(a.duration) - durationMinutes(b.duration) || a.title.localeCompare(b.title);
      return 0;
    });
  }, [filteredTests, sortBy]);
  const average = history.length ? Math.round(history.reduce((sum, item) => sum + Number(item.percent || 0), 0) / history.length) : null;
  const completionProgress = tests.length ? Math.min(100, Math.round((history.length / tests.length) * 100)) : 0;
  const best = history.length ? Math.max(...history.map((item) => Number(item.scorePercent || 0))) : null;
  const averageTimePerQuestion = history.length ? Math.round(history.reduce((sum, item) => sum + Number(item.result?.timeTakenSeconds || 0) / Math.max(1, item.questionCount), 0) / history.length) : null;

  return (
    <div className="min-h-screen bg-[#030d1b] text-slate-100 md:flex">
      {mobileSidebarOpen ? <button type="button" aria-label="Close navigation menu" onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 z-[45] bg-black/60 backdrop-blur-[2px] md:hidden" /> : null}
      <button type="button" aria-label={mobileSidebarOpen ? "Hide navigation menu" : "Show navigation menu"} aria-expanded={mobileSidebarOpen} aria-controls="test-rank-sidebar" onClick={() => setMobileSidebarOpen((open) => !open)} className="fixed right-3 top-24 z-[60] grid h-10 w-10 place-items-center rounded-xl border border-sky-200/25 bg-[#0a1c34] text-sky-100 shadow-lg shadow-black/40 transition hover:bg-[#123054] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 md:hidden">{mobileSidebarOpen ? "×" : "☰"}</button>
      <aside id="test-rank-sidebar" className={`fixed inset-y-0 left-0 z-50 ${mobileSidebarOpen ? "flex" : "hidden md:flex"} w-[min(84vw,300px)] flex-col border-r border-sky-300/10 bg-[linear-gradient(180deg,#07152a_0%,#041124_46%,#030d1b_100%)] px-3.5 py-4 shadow-[12px_0_40px_rgba(0,0,0,.35)] md:z-30 md:w-64 md:shadow-[12px_0_40px_rgba(0,0,0,.18)]`}>
        <div className="mb-2 flex justify-end md:hidden"><button type="button" onClick={() => setMobileSidebarOpen(false)} aria-label="Hide navigation menu" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[.04] text-slate-300 hover:bg-white/10">×</button></div>
        <Link href="https://www.badamclasses.in" className="mb-4 flex items-center rounded-2xl border border-white/[.08] bg-white/[.035] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] transition hover:border-sky-200/20 hover:bg-white/[.055]">
          <Image src="/new-logo.webp" alt="Badam Classes" width={1536} height={1024} className="h-11 w-full rounded-xl object-cover object-center" />
        </Link>
        <Link href={student ? "/profile" : "/login"} className="mb-5 flex items-center gap-3 rounded-xl border border-white/[.07] bg-[#0a1c34]/75 p-2.5 transition hover:border-sky-200/20 hover:bg-[#0d2341]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-sky-200/30 bg-gradient-to-br from-sky-300 to-blue-700 text-sm font-bold text-white shadow-md shadow-blue-950/40">{student?.name?.[0]?.toUpperCase() || <Icon name="user" className="h-5 w-5" />}</span>
          <span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400">Student account</span><span className="mt-0.5 block truncate text-sm font-bold text-white">{student?.name || "Welcome, learner"}</span></span>
          <span aria-hidden="true" className="text-xs text-slate-500">⌄</span>
        </Link>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:rgba(148,163,184,.2)_transparent] [scrollbar-width:thin]">
          {Array.from(new Set(mainLinks.map((item) => item.section))).map((section) => <section key={section} className="mb-4">
            <p className="mb-1.5 px-2 text-[9px] font-extrabold uppercase tracking-[.2em] text-slate-500">{section}</p>
            <nav className="grid gap-1">
              {mainLinks.map((item) => item.section === section ? <Link key={item.label} href={item.href} onClick={() => setMobileSidebarOpen(false)} aria-current={item.active ? "page" : undefined} className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition-all duration-200 ${item.active ? "border-blue-300/30 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white shadow-[0_8px_20px_rgba(37,99,235,.25)]" : "border-transparent text-slate-300 hover:translate-x-0.5 hover:border-white/[.07] hover:bg-white/[.045] hover:text-white"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${item.active ? "bg-white/15 text-white" : "bg-white/[.035] text-slate-400 group-hover:bg-sky-300/10 group-hover:text-sky-200"}`}><Icon name={item.icon} className="h-[17px] w-[17px]" /></span><span className="min-w-0 flex-1 truncate">{item.label}</span>{item.badge ? <span className="rounded-md border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[8px] font-extrabold tracking-wide text-emerald-200">{item.badge}</span> : null}</Link> : null)}
            </nav>
          </section>)}
          <section className="mb-3 border-t border-white/[.07] pt-3"><p className="mb-1.5 px-2 text-[9px] font-extrabold uppercase tracking-[.2em] text-slate-500">Quick Access</p>
            <nav className="grid gap-1">{[{ label: "Doubt Support", href: "/contact", icon: "help" }, { label: "Live Classes", href: "/batches", icon: "live" }, { label: "Notifications", href: "/dashboard", icon: "bell" }, { label: "Settings", href: "/profile", icon: "settings" }].map((item) => <Link key={item.label} href={item.href} onClick={() => setMobileSidebarOpen(false)} className="group flex items-center gap-3 rounded-xl px-3 py-2 text-[12px] font-medium text-slate-400 transition hover:bg-white/[.045] hover:text-white"><Icon name={item.icon} className="h-[17px] w-[17px] text-slate-500 transition group-hover:text-sky-200" />{item.label}</Link>)}</nav>
          </section>
        </div>
        <div className="mt-3 rounded-2xl border border-amber-200/15 bg-[radial-gradient(ellipse_at_100%_0%,rgba(245,158,11,.15),transparent_55%),linear-gradient(140deg,rgba(17,43,80,.9),rgba(8,22,41,.96))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]"><p className="flex items-center gap-2 text-[13px] font-extrabold text-amber-100"><span className="grid h-7 w-7 place-items-center rounded-lg border border-amber-200/15 bg-amber-300/10 text-amber-200" aria-hidden="true">♛</span> Go Premium</p><p className="mt-2 text-[10px] leading-4 text-slate-300">Unlock courses, tests, mock exams and expert guidance.</p><Link href="/courses" className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-300 to-orange-400 px-3 py-2 text-[11px] font-extrabold text-slate-950 shadow-lg shadow-amber-950/20 transition hover:brightness-110">Explore Courses <span aria-hidden="true">→</span></Link></div>
      </aside>

      <div className="min-w-0 flex-1 md:ml-64">
        <header className="relative z-40 border-b border-sky-400/15 bg-[#020b18]/95 px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,.18)] backdrop-blur-xl md:sticky md:top-0 md:px-7 md:py-3">
          <div className="space-y-4 md:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href={student ? "/profile" : "/login"} className="flex min-w-0 items-center gap-3" aria-label={student ? "Open profile" : "Log in"}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-white/80 bg-gradient-to-br from-cyan-400 to-blue-700 text-lg font-bold text-white shadow-lg shadow-blue-950/40">{student?.name?.[0]?.toUpperCase() || <Icon name="user" className="h-6 w-6" />}</span>
                <span className="min-w-0"><span className="block text-sm text-blue-100">Hi,</span><span className="block truncate text-xl font-bold leading-tight text-white">{student?.name || "Learner"} <span aria-hidden="true">👋</span></span></span>
              </Link>
              <div className="flex shrink-0 items-center gap-2"><Link href="/contact" aria-label="Contact support" className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/[.08] text-white transition hover:bg-white/15"><Icon name="help" className="h-5 w-5" /></Link><Link href="/dashboard" aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10"><Icon name="bell" className="h-5 w-5" /></Link></div>
            </div>
            <nav aria-label="TestRank sections" className="relative isolate grid grid-cols-2 rounded-full border border-violet-400/40 bg-[#070810] p-1 shadow-[0_0_20px_rgba(91,33,182,.2)]">
              <span aria-hidden="true" className="nav-switch-indicator nav-switch-rank absolute inset-y-1 left-1 z-0 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-violet-700 to-indigo-600 shadow-md shadow-violet-950/50" />
              <Link href="https://www.badamclasses.in" className="relative z-10 flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 text-[11px] font-semibold tracking-tight text-slate-300 transition-colors duration-300 hover:text-white sm:gap-2 sm:px-3 sm:text-sm"><Icon name="home" className="h-4 w-4 shrink-0" />Badam Classes</Link>
              <Link href="/test-rank" aria-current="page" className="relative z-10 flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 text-[11px] font-bold tracking-tight text-white transition-colors duration-300 sm:gap-2 sm:px-3 sm:text-sm"><Icon name="chart" className="h-4 w-4 shrink-0" />BadamTestRanker</Link>
            </nav>
            <label className="flex w-full items-center gap-2 rounded-xl border border-blue-300/20 bg-[#071a33] px-3.5 py-2.5 shadow-inner shadow-blue-950/40"><Icon name="search" className="h-[18px] w-[18px] shrink-0 text-sky-300" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tests, exams and subjects" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" aria-label="Search tests and topics" /></label>
          </div>
          <div className="hidden w-full items-center justify-between gap-3 md:flex">
            <label className="flex w-full items-center gap-2 rounded-full border border-blue-400/25 bg-[#071a33] px-4 py-2.5 shadow-inner shadow-blue-950/50 md:ml-7 md:max-w-2xl"><Icon name="search" className="h-[18px] w-[18px] shrink-0 text-sky-300" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tests, exams and subjects" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" aria-label="Search tests and topics" /><kbd className="hidden rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400 sm:block">⌘ K</kbd></label>
            <div className="ml-auto flex items-center gap-3"><span className="hidden text-right sm:block"><b className="block text-xs text-white">{student?.name || "Student"}</b><small className="text-[10px] text-slate-400">Student</small></span><span className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/20 text-sm font-semibold">{student?.name?.[0]?.toUpperCase() || <Icon name="user" className="h-4 w-4" />}</span><Link href={student ? "/profile" : "/login"} className="text-slate-400" aria-label={student ? "Open profile" : "Log in"}>⌄</Link></div>
          </div>
          <nav aria-label="TestRank sections" className="relative isolate mx-auto mt-3 hidden w-full max-w-[520px] grid-cols-2 rounded-full border border-violet-400/35 bg-[#070810] p-1 shadow-[0_0_24px_rgba(91,33,182,.18)] md:grid">
            <span aria-hidden="true" className="nav-switch-indicator nav-switch-rank absolute inset-y-1 left-1 z-0 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-violet-700 to-indigo-600 shadow-md shadow-violet-950/50" />
            <Link href="https://www.badamclasses.in" className="relative z-10 flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-slate-300 transition-colors duration-300 hover:text-white"><Icon name="home" className="h-4 w-4" />Badam Classes</Link>
            <Link href="/test-rank" aria-current="page" className="relative z-10 flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold text-white transition-colors duration-300"><Icon name="chart" className="h-4 w-4" />BadamTestRanker</Link>
          </nav>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 pb-24 text-slate-100 sm:p-6 lg:p-7">
          <p className="mb-4 hidden text-xs font-medium text-slate-400 sm:block"><Link href="https://www.badamclasses.in" className="transition hover:text-white">Home</Link><span className="mx-2 text-slate-600">/</span><span className="text-sky-200">Badam TestRank</span></p>
          <div className="grid gap-4">
            <section aria-label="Badam TestRank welcome banner" className="overflow-hidden rounded-2xl border border-blue-200/20 bg-[#061a39] shadow-[0_22px_60px_rgba(0,0,0,.32)]">
              <Link href="#all-tests" aria-label="Explore Badam TestRank mock tests" className="group block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200">
                <Image src="/test-rank-welcome-banner.jpg" alt="Welcome to BadamTest, the new era of mock tests — real exam pattern and smart analysis" width={1024} height={320} priority sizes="(max-width: 768px) 100vw, (max-width: 1600px) 100vw, 1600px" className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.01]" />
              </Link>
            </section>
            <section className="grid gap-3 rounded-2xl border border-blue-500/35 bg-[radial-gradient(ellipse_at_12%_20%,rgba(16,102,234,.18),transparent_42%),linear-gradient(120deg,#031a43,#05245a_58%,#031633)] p-3 shadow-[0_24px_65px_rgba(0,0,0,.2)] sm:grid-cols-[minmax(0,1.2fr)_minmax(250px,.8fr)] sm:items-center sm:gap-5 sm:p-6"><div className="flex min-w-0 items-center gap-3 sm:gap-6"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-full p-[5px] sm:h-28 sm:w-28 sm:p-[6px]" style={{ background: `conic-gradient(#1687ff ${completionProgress}%,#0c3978 0)` }}><div className="grid h-full w-full place-items-center rounded-full bg-[#06204a] text-lg font-bold text-white sm:text-2xl">{historyLoading ? "…" : `${completionProgress}%`}</div></div><div className="hidden h-20 w-px shrink-0 bg-blue-400/25 sm:block" /><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-blue-200 sm:text-xs sm:tracking-[.15em]">Overall Progress</p><h2 className="mt-1 text-base font-bold text-white sm:mt-2 sm:text-2xl">Completed practice</h2><p className="mt-0.5 text-xl font-bold text-cyan-300 sm:mt-1.5 sm:text-2xl">{historyLoading ? "…" : history.length}<span className="ml-2 text-sm font-semibold text-white sm:text-base">attempts</span></p><p className="mt-0.5 text-[10px] leading-4 text-blue-200 sm:mt-1 sm:text-xs sm:leading-5">{loading ? "Loading available tests…" : `Out of ${tests.length} available tests`} · Keep practicing to improve your performance.</p></div></div><div className="flex min-h-0 items-center gap-3 rounded-xl border border-blue-400/25 bg-blue-900/25 p-3 sm:min-h-28 sm:gap-4 sm:p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/20 text-cyan-300 sm:h-12 sm:w-12"><svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8m-4-4v4M7 4H4v2a5 5 0 0 0 4.3 5M17 4h3v2a5 5 0 0 1-4.3 5M7 3h10v7a5 5 0 0 1-10 0z"/><path d="m12 5 1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L9 7.3 11 7z"/></svg></span><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-blue-200 sm:text-xs sm:tracking-[.15em]">Best saved score</p><p className="mt-1 text-xl font-bold text-white sm:mt-1.5 sm:text-2xl">{historyLoading ? "…" : best === null ? "—" : `${best}%`}</p><p className="mt-1 text-[10px] text-blue-200 sm:text-[11px]">Highest score across submitted tests</p></div></div></section>
          </div>

          <section aria-label="Choose a test format" className="mt-5 md:hidden">
            <div className="mb-3 flex items-end justify-between gap-2">
              <div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-sky-300">Quick access</p><h2 className="mt-1 text-base font-bold text-white">Choose your test</h2></div>
              <span className="pb-0.5 text-[10px] font-medium text-slate-400">Pick a format <span aria-hidden="true">→</span></span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { title: "Live Mock", detail: `${tests.filter((item) => item.source === "Verified online test").length} timed tests`, label: "LIVE", action: "Start", icon: "live", tone: "border-rose-300/35 from-[#321326] via-[#1b1832] to-[#0c1930] text-rose-100", iconTone: "bg-rose-400/15 text-rose-200", href: "/test-rank?mode=timed#all-tests" },
                { title: "Premium Mock", detail: "Exam-length premium practice", label: "PREMIUM", action: "Explore", icon: "crown", tone: "border-amber-300/35 from-[#38290e] via-[#292018] to-[#11182a] text-amber-100", iconTone: "bg-amber-400/15 text-amber-200", href: "/test-rank?mode=full#all-tests" },
                { title: "PYQ Mock", detail: "Practice previous year papers", label: "PYQ", action: "Practice", icon: "paper", tone: "border-cyan-300/35 from-[#103144] via-[#10283a] to-[#0b1930] text-cyan-100", iconTone: "bg-cyan-400/15 text-cyan-200", href: "/test-rank?tab=Previous%20Year%20Papers#all-tests" },
                { title: "Paid Mock", detail: `${tests.filter((item) => item.access === "Premium").length} paid tests`, label: "PAID", action: "Browse", icon: "payment", tone: "border-violet-300/35 from-[#29204a] via-[#211b3d] to-[#10182d] text-violet-100", iconTone: "bg-violet-400/15 text-violet-200", href: "/test-rank?tab=Premium%20Tests#all-tests" }
              ].map((item) => <Link key={item.title} href={item.href} aria-label={`${item.title}: ${item.detail}. ${item.action} now`} className={`group relative isolate flex min-h-[160px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-2.5 shadow-[0_14px_30px_rgba(0,0,0,.3)] ring-1 ring-white/[.04] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_42px_rgba(0,0,0,.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#030d1b] motion-reduce:transform-none motion-reduce:transition-none ${item.tone}`}>
                <span aria-hidden="true" className="pointer-events-none absolute -right-7 -top-8 h-24 w-24 rounded-full bg-white/[.11] blur-2xl transition-opacity group-hover:opacity-90" />
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-70" />
                <span className="relative flex items-start justify-between gap-1"><span className={`grid h-10 w-10 place-items-center rounded-xl border border-white/15 shadow-[0_0_24px_rgba(255,255,255,.08)] ${item.iconTone}`}><Icon name={item.icon} className="h-5 w-5" /></span><span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[7px] font-extrabold tracking-[.12em] text-white/90 shadow-inner">{item.label}</span></span>
                <span className="relative block min-w-0"><b className="block text-[12px] font-bold leading-4 tracking-wide text-white">{item.title}</b><small className="mt-1 block text-[9px] leading-3 text-slate-200/80">{item.detail}</small><span className="mt-2.5 flex items-center justify-between border-t border-white/15 pt-2 text-[9px] font-bold text-white/90"><span>{item.action}</span><span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full border border-white/15 bg-white/[.08] text-sm transition group-hover:translate-x-0.5 group-hover:bg-white/[.16]">→</span></span></span>
              </Link>)}
            </div>
          </section>
          <section className="relative mt-4 overflow-hidden rounded-2xl border border-blue-300/20 bg-[linear-gradient(115deg,#102f85,#143caa_62%,#0b245f)] p-5 text-white shadow-[0_18px_45px_rgba(7,25,83,.28)] md:hidden">
            <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-cyan-300/15 blur-2xl" />
            <div className="relative flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-amber-200"><Icon name="school" className="h-6 w-6" /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-200">Your preparation plan</p><h2 className="mt-1 text-lg font-bold">Build a stronger daily routine</h2><p className="mt-1 text-xs leading-5 text-blue-100/80">Practice topic-wise, follow current affairs and keep your exam goals on track.</p></div></div>
            <div className="relative mt-4 flex flex-wrap gap-2"><Link href="/mock-tests" className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15">Daily Quiz</Link><Link href="/current-affairs" className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15">Current Affairs</Link><Link href="/courses" className="ml-auto rounded-full bg-white px-3.5 py-2 text-xs font-bold text-blue-950 transition hover:bg-blue-50">Explore courses →</Link></div>
          </section>
          <div className="mt-5 hidden grid-cols-1 gap-3 sm:grid-cols-2 md:grid 2xl:grid-cols-4">{[{ title: "Live Mock", subtitle: "Timed exam simulations", href: "/test-rank?mode=timed#all-tests", icon: "live", tone: "blue", label: "REAL-TIME PRACTICE" }, { title: "Premium Mock", subtitle: "Exam-length premium practice", href: "/test-rank?mode=full#all-tests", icon: "crown", tone: "amber", label: "EXCLUSIVE SERIES" }, { title: "PYQ Mock", subtitle: "Previous year question papers", href: "/test-rank?tab=Previous%20Year%20Papers#all-tests", icon: "paper", tone: "violet", label: "PAST EXAM PAPERS" }, { title: "Paid Mock", subtitle: "Unlock paid test series", href: "/test-rank?tab=Premium%20Tests#all-tests", icon: "payment", tone: "green", label: "PREMIUM ACCESS" }].map((item) => <Link key={item.title} href={item.href} className={`group relative isolate flex min-h-[145px] flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-[0_18px_40px_rgba(0,0,0,.28)] ring-1 ring-white/[.05] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_52px_rgba(0,0,0,.42)] sm:min-h-[160px] sm:p-5 ${item.tone === "blue" ? "border-blue-400/70 bg-[linear-gradient(145deg,rgba(7,48,112,.82),rgba(5,27,67,.98))] text-blue-300 hover:border-blue-300" : item.tone === "green" ? "border-teal-400/65 bg-[linear-gradient(145deg,rgba(0,75,79,.76),rgba(3,35,48,.98))] text-teal-300 hover:border-teal-300" : item.tone === "violet" ? "border-violet-400/65 bg-[linear-gradient(145deg,rgba(49,35,123,.78),rgba(24,20,71,.98))] text-violet-300 hover:border-violet-300" : "border-amber-400/65 bg-[linear-gradient(145deg,rgba(91,57,20,.74),rgba(30,31,40,.98))] text-amber-300 hover:border-amber-300"}`}><span aria-hidden="true" className={`pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full opacity-20 blur-3xl transition duration-300 group-hover:opacity-45 ${item.tone === "blue" ? "bg-sky-300" : item.tone === "green" ? "bg-teal-300" : item.tone === "violet" ? "bg-violet-300" : "bg-amber-200"}`} /><span className={`pointer-events-none absolute -bottom-16 -right-8 h-32 w-2/3 rotate-[-32deg] opacity-25 transition group-hover:opacity-45 ${item.tone === "blue" ? "bg-blue-500" : item.tone === "green" ? "bg-teal-400" : item.tone === "violet" ? "bg-violet-500" : "bg-amber-400"}`} /><span className="relative z-10 flex w-full items-start justify-between"><span className={`grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-white/[.1] text-white shadow-[0_0_28px_rgba(255,255,255,.1)] backdrop-blur sm:h-14 sm:w-14 ${item.tone === "blue" ? "shadow-blue-400/20" : item.tone === "green" ? "shadow-teal-400/20" : item.tone === "violet" ? "shadow-violet-400/20" : "shadow-amber-300/20"}`}><Icon name={item.icon} className="h-6 w-6 sm:h-7 sm:w-7" /></span><span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/20 text-xl text-white/90 transition group-hover:translate-x-1 group-hover:bg-white/10">→</span></span><span className="relative z-10"><small className="block text-[9px] font-extrabold uppercase tracking-[.2em] text-white/65">{item.label}</small><b className="mt-1 block text-lg font-bold tracking-tight text-white sm:text-xl">{item.title}</b><small className="mt-1 block text-sm text-slate-200/80">{item.subtitle}</small></span></Link>)}</div>

          <section id="all-tests" aria-label="Mock test formats" className="mt-7 scroll-mt-24 overflow-hidden rounded-2xl border border-white/[.08] bg-[linear-gradient(110deg,rgba(9,24,47,.94),rgba(5,14,29,.92))] p-3 shadow-[0_22px_55px_rgba(0,0,0,.24)] sm:p-4">
            <div className="mb-3 flex items-end justify-between gap-3 px-1">
              <div><p className="text-[9px] font-extrabold uppercase tracking-[.22em] text-cyan-300">Choose your format</p><h2 className="mt-1 text-lg font-bold tracking-tight text-white sm:text-xl">Practice that moves your rank</h2></div>
              <span className="hidden text-[10px] font-medium text-slate-400 sm:block">Swipe to explore <span aria-hidden="true" className="text-cyan-300">→</span></span>
            </div>
            <div className="grid grid-cols-3 gap-2 pb-2 md:flex md:snap-x md:snap-mandatory md:gap-3 md:overflow-x-auto md:pb-2 md:[scrollbar-color:rgba(125,211,252,.28)_transparent] md:[scrollbar-width:thin]">
              {practiceFormats.map((item) => {
                const isSelected = selectedFormat === item.id;
                const formatTests = isSelected ? filteredTests : [];
                const toneBorder = item.tone === "blue" ? "border-blue-300/30" : item.tone === "emerald" ? "border-emerald-300/30" : item.tone === "violet" ? "border-violet-300/30" : item.tone === "amber" ? "border-amber-300/30" : item.tone === "cyan" ? "border-cyan-300/30" : "border-rose-300/30";
                const toneBackground = item.tone === "blue" ? "bg-[linear-gradient(145deg,rgba(12,43,82,.98),rgba(8,21,42,.98))]" : item.tone === "emerald" ? "bg-[linear-gradient(145deg,rgba(8,55,47,.98),rgba(8,26,32,.98))]" : item.tone === "violet" ? "bg-[linear-gradient(145deg,rgba(43,31,83,.98),rgba(22,21,48,.98))]" : item.tone === "amber" ? "bg-[linear-gradient(145deg,rgba(66,48,20,.98),rgba(31,27,25,.98))]" : item.tone === "cyan" ? "bg-[linear-gradient(145deg,rgba(10,52,70,.98),rgba(8,26,39,.98))]" : "bg-[linear-gradient(145deg,rgba(67,28,52,.98),rgba(30,22,39,.98))]";
                return <article key={item.id} className={`group relative ${isSelected ? "col-span-3 w-full md:col-span-1 md:w-[min(340px,85vw)]" : "w-full min-w-0 md:w-[238px] md:min-w-[238px]"} min-h-[150px] overflow-hidden rounded-xl border p-2 text-left shadow-[0_14px_28px_rgba(0,0,0,.28)] ring-1 ring-white/[.04] transition-[width,border-color,box-shadow] duration-300 sm:min-h-[176px] sm:p-4 md:shrink-0 md:snap-start ${toneBorder} ${toneBackground} ${isSelected ? "border-opacity-80 shadow-[0_20px_40px_rgba(0,0,0,.38)]" : "hover:-translate-y-1 hover:shadow-[0_22px_38px_rgba(0,0,0,.4)]"}`}>
                <span aria-hidden="true" className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-20 blur-3xl transition duration-300 group-hover:opacity-50 ${item.tone === "blue" ? "bg-sky-300" : item.tone === "emerald" ? "bg-emerald-300" : item.tone === "violet" ? "bg-violet-300" : item.tone === "amber" ? "bg-amber-200" : item.tone === "cyan" ? "bg-cyan-300" : "bg-rose-300"}`} />
                <button type="button" onClick={() => selectFormat(item.id)} aria-expanded={isSelected} className="relative flex min-h-[120px] w-full flex-col justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 sm:min-h-[144px]">
                  <span className="relative flex items-start justify-between gap-1 sm:gap-2"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/[.09] shadow-[0_0_24px_rgba(255,255,255,.08)] sm:h-11 sm:w-11 sm:rounded-xl ${item.tone === "blue" ? "text-sky-200" : item.tone === "emerald" ? "text-emerald-200" : item.tone === "violet" ? "text-violet-200" : item.tone === "amber" ? "text-amber-200" : item.tone === "cyan" ? "text-cyan-200" : "text-rose-200"}`}><Icon name={item.icon} className="h-4 w-4 sm:h-5 sm:w-5" /></span><span className={`max-w-[60%] truncate rounded-full border border-white/10 bg-black/20 px-1.5 py-1 text-[7px] font-extrabold tracking-normal sm:max-w-none sm:px-2 sm:text-[8px] sm:tracking-[.12em] ${item.tone === "blue" ? "text-sky-200" : item.tone === "emerald" ? "text-emerald-200" : item.tone === "violet" ? "text-violet-200" : item.tone === "amber" ? "text-amber-200" : item.tone === "cyan" ? "text-cyan-200" : "text-rose-200"}`}>{item.badge}</span></span>
                  <span className="relative"><b className="block text-[11px] font-bold leading-tight tracking-tight text-white sm:text-sm">{item.title}</b><small className="mt-1 block text-[9px] leading-[1.35] text-slate-300 sm:mt-1.5 sm:text-[11px] sm:leading-[1.45]">{item.detail}</small><span className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-[9px] font-bold text-white/85 sm:mt-3 sm:pt-2.5 sm:text-[10px]"><span>{isSelected ? "Close tests" : "Explore"}</span><span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full border border-white/10 bg-white/[.06] transition group-hover:translate-x-0.5 group-hover:bg-white/[.14] sm:h-6 sm:w-6">{isSelected ? "−" : "→"}</span></span></span>
                </button>
                {isSelected ? <div className="relative mt-3 border-t border-white/15 pt-3" aria-live="polite"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-white/75">{loading ? "Loading tests" : `${filteredTests.length} tests`}</p><span className="text-[9px] text-white/55">Tap a test to start</span></div>{loading ? <div className="space-y-2">{[1, 2, 3].map((index) => <div key={index} className="h-10 animate-pulse rounded-lg bg-black/20" />)}</div> : formatTests.length ? <div className="max-h-64 space-y-2 overflow-y-auto pr-1">{formatTests.slice(0, pageSize).map((test) => <Link key={test.id} href={test.href.includes("/mock-tests/free-practice") ? `${test.href}${test.href.includes("?") ? "&" : "?"}start=1` : test.href} className="block rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 transition hover:border-white/25 hover:bg-white/[.08]"><span className="block truncate text-[11px] font-bold text-white">{test.title}</span><span className="mt-1 flex items-center justify-between gap-2 text-[9px] text-white/65"><span className="truncate">{test.exam}</span><span className="shrink-0">{test.questionCount || "—"} Q · {test.duration}</span></span></Link>)}</div> : <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-[11px] leading-5 text-white/70">{error || `No ${item.title.toLowerCase()} are published yet.`}</p>}{!loading && formatTests.length > pageSize ? <button type="button" onClick={() => setPageSize((size) => size + 5)} className="mt-2 w-full rounded-lg border border-white/15 px-3 py-2 text-[10px] font-bold text-white/80 transition hover:bg-white/[.08]">Show more tests</button> : null}</div> : null}
              </article>;
              })}
            </div>
          {showLibrary ? <div id="test-library" className="mt-4 scroll-mt-24 grid items-start gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(310px,.75fr)]">
            <section className="min-w-0 rounded-xl border border-sky-400/20 bg-[#041326] p-4 sm:p-5">
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
                    const content = <>{item.id === "timed" ? <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-rose-300/30 bg-rose-400/10 px-2 py-1 text-[8px] font-extrabold tracking-[.12em] text-rose-100"><span className="relative grid h-2 w-2 place-items-center"><span className="absolute h-2 w-2 rounded-full bg-rose-400 opacity-70 motion-safe:animate-ping" /><span className="relative h-1.5 w-1.5 rounded-full bg-rose-300" /></span>LIVE</span> : null}<span className={`grid h-9 w-9 place-items-center rounded-xl ${item.tone === "emerald" ? "bg-emerald-400/10 text-emerald-200" : item.tone === "cyan" ? "bg-cyan-400/10 text-cyan-200" : item.tone === "blue" ? "bg-blue-400/10 text-blue-200" : item.tone === "amber" ? "bg-amber-400/10 text-amber-200" : "bg-violet-400/10 text-violet-200"}`}><Icon name={item.icon} className="h-5 w-5" /></span><span className="mt-3 block text-[12px] font-bold leading-4 text-white sm:text-[13px]">{item.title}</span><span className="mt-1 block text-[10px] leading-4 text-slate-400">{item.detail}</span></>;
                    const cardClass = `group relative min-h-[116px] rounded-xl border p-3 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${item.id === "timed" ? "isolate overflow-hidden border-rose-300/55 bg-[linear-gradient(145deg,rgba(76,22,44,.92),rgba(8,26,50,.98))] shadow-[0_0_24px_rgba(244,63,94,.18)] hover:border-rose-200 hover:shadow-[0_0_30px_rgba(244,63,94,.28)]" : "border-white/10 bg-[#081a32] hover:border-blue-300/35 hover:bg-[#0b2040]"}`;
                    if (item.id === "ranking") return <Link key={item.id} href="#my-performance" aria-label="View your performance and test ranking; leaderboards are available from submitted test results" className={cardClass}>{content}</Link>;
                    return <button key={item.id} type="button" className={cardClass} onClick={() => selectQuickTest(item.id)}>{content}</button>;
                  })}
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-blue-300">Test library</p><h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">{directExamView ? `${subExam || exam} Mock Tests` : "All Mock Tests"}</h2><p className="mt-1 text-xs text-slate-400">{loading ? "Loading published tests…" : `${filteredTests.length} tests and practice sets`}</p></div><div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2 xl:grid-cols-3"><FilterSelect label="Exam" value={exam} onChange={chooseExam} options={["All exams", ...exams]} /><FilterSelect label="Subject" value={subject} onChange={setSubject} options={["All subjects", ...subjects]} /><FilterSelect label="Difficulty" value={difficulty} onChange={setDifficulty} options={["All levels", ...new Set(tests.map((item) => item.difficulty))]} /><FilterSelect label="Language" value={language} onChange={setLanguage} options={["All languages", ...new Set(tests.map((item) => item.language))]} /><FilterSelect label="Sort" value={sortBy} onChange={setSortBy} options={["Recommended", "Most questions", "Shortest duration"]} /></div></div>
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#07152c] p-2 sm:grid-cols-3 xl:grid-cols-5">{mockModes.map((mode) => <button key={mode.id} type="button" onClick={() => { setMockMode(mode.id); setTab("All Tests"); updateLibraryUrl({ mode: mode.id === "all" ? "" : mode.id, tab: "" }); }} aria-pressed={mockMode === mode.id} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition sm:text-sm ${mockMode === mode.id ? "border-orange-300/40 bg-orange-500/15 text-orange-100 shadow-lg shadow-orange-950/10" : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[.04]"}`}><Icon name={mode.icon} className="h-4 w-4 shrink-0" />{mode.label}</button>)}</div>
              {supportedSelectedSubExams.length ? <div className="mb-4 flex gap-2 overflow-x-auto pb-2">{[{ name: `All ${exam}` }, ...supportedSelectedSubExams].map((item) => { const active = item.name === `All ${exam}` ? !subExam : subExam === item.name; return <button key={item.name} type="button" onClick={() => { const nextSubExam = item.name === `All ${exam}` ? "" : item.name; setSubExam(nextSubExam); setDirectExamView(Boolean(nextSubExam)); setShowLibrary(true); const params = new URLSearchParams(window.location.search); params.set("exam", exam); if (nextSubExam) params.set("subExam", nextSubExam); else params.delete("subExam"); window.history.pushState(null, "", `/test-rank?${params.toString()}#test-library`); }} aria-pressed={active} className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${active ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-50" : "border-white/10 bg-white/[.03] text-slate-300 hover:border-cyan-300/25"}`}><Icon name={item.name === `All ${exam}` ? "grid" : subExamIconName(item.name, exam)} className="h-4 w-4 shrink-0" />{item.name}</button>; })}</div> : null}
              <div id="test-filters" className="mb-4 flex scroll-mt-24 gap-2 overflow-x-auto pb-2">{tabs.map((name) => <button key={name} onClick={() => { setTab(name); updateLibraryUrl({ tab: name === "All Tests" ? "" : name }); }} aria-pressed={tab === name} className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition ${tab === name ? "border-blue-300/50 bg-blue-500/20 text-blue-100" : "border-white/10 bg-white/[.03] text-slate-300 hover:bg-white/[.08]"}`}>{name}</button>)}</div>
              {error && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100"><span>{error}</span><button onClick={loadTests} className="rounded-lg border border-amber-200/30 px-3 py-2 font-semibold">Retry</button></div>}
              {loading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-48 animate-pulse rounded-xl border border-white/10 bg-white/[.04]" />)}</div> : filteredTests.length ? <div className="grid gap-3 md:grid-cols-2">{sortedTests.slice(0, pageSize).map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-[#07172e] p-4 transition hover:border-blue-300/30"><div className="flex items-start justify-between gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold ${item.access === "Premium" ? "border-amber-300/20 bg-amber-400/10 text-amber-100" : "border-blue-300/20 bg-blue-400/10 text-blue-100"}`}><Icon name={item.access === "Premium" ? "school" : "check"} className="h-3.5 w-3.5" />{item.access}</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white/[.06] px-2.5 py-1 text-[10px] text-slate-300"><Icon name="paper" className="h-3.5 w-3.5" />{item.type}</span></div><h3 className="mt-3 text-base font-bold text-white">{item.title}</h3><p className="mt-1 text-xs text-slate-400">{item.exam}</p><div className="mt-4 grid grid-cols-2 xl:grid-cols-5 gap-2 text-[11px]"><Detail icon="paper" label="Questions" value={item.questionCount || "—"} /><Detail icon="clock" label="Duration" value={item.duration} /><Detail icon="spark" label="Difficulty" value={item.difficulty} /><Detail icon="award" label="Marks" value={item.marks} /><Detail icon="book" label="Language" value={item.language} /></div><div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3"><span className="truncate text-[10px] text-slate-500">{item.source}</span><Link href={item.href} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-blue-400">{item.access === "Premium" ? "Unlock Test" : "Start Test"}<Icon name="arrow" className="h-3.5 w-3.5" /></Link></div></article>)}</div> : <div className="rounded-xl border border-dashed border-white/15 p-8 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-blue-300/20 bg-blue-400/10 text-blue-200"><Icon name={mockMode === "timed" ? "clock" : "search"} className="h-6 w-6" /></span><p className="mt-3 font-semibold text-white">{mockMode === "timed" ? "No timed online tests are published yet" : "No tests match these filters"}</p><p className="mt-2 text-sm text-slate-400">{mockMode === "timed" ? "Check back when a verified online mock is available." : "Try another exam or search term."}</p></div>}
              {!loading && filteredTests.length > pageSize && <button onClick={() => setPageSize((size) => size + 12)} className="mx-auto mt-5 block rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-blue-300/40">Load more tests</button>}
          <p className="mt-4 text-[10px] leading-5 text-slate-500">Published tests, PDF question-bank sets, online MCQs and built-in practice mocks are collected here. Published online tests use timed server-scored attempts and verified results.</p>
            </section>

            <aside className="grid content-start gap-4"><section className="rounded-xl border border-sky-400/20 bg-[#041326] p-4"><div className="flex items-center justify-between"><h2 className="font-bold text-white">Upcoming Tests</h2><a href="#all-tests" className="text-xs text-sky-300">View all →</a></div><div className="mt-3 rounded-lg border border-white/10 bg-white/[.025] p-4 text-center"><p className="text-sm font-medium text-slate-200">No scheduled tests available</p><p className="mt-1 text-xs text-slate-500">Published practice sets appear in All Mock Tests.</p></div></section><section id="my-performance" className="rounded-xl border border-sky-400/20 bg-[#041326] p-4"><div className="flex items-center justify-between"><h2 className="font-bold text-white">Performance Overview</h2><span className="text-[10px] text-slate-500">Verified submissions</span></div>{history.length ? <><div className="mt-5 flex h-32 items-end gap-2 border-b border-l border-white/10 px-2">{history.slice(-8).map((item, index) => <div key={item.id || index} className="flex-1 rounded-t bg-gradient-to-t from-blue-700 to-cyan-400" style={{ height: `${Math.max(8, Math.min(100, Number(item.percent) || 0))}%` }} title={`${item.percent}% accuracy`} />)}</div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><SmallStat label="Attempts" value={history.length} /><SmallStat label="Average accuracy" value={`${average}%`} /><SmallStat label="Best score" value={`${best}%`} /><SmallStat label="Avg seconds / question" value={`${averageTimePerQuestion ?? "—"}s`} /></div></> : <div className="mt-4 rounded-lg border border-dashed border-white/10 p-5 text-center"><p className="text-sm text-slate-300">Your verified performance appears here</p><p className="mt-1 text-xs text-slate-500">Complete a published online test while logged in.</p></div>}</section><section className="rounded-xl border border-amber-300/20 bg-[linear-gradient(115deg,#211a0a,#11192b_65%,#0b2343)] p-5"><p className="text-xs font-bold uppercase tracking-wide text-amber-300">♛ Badam Classes</p><h2 className="mt-2 text-xl font-bold text-white">Build your exam plan</h2><p className="mt-2 text-xs leading-5 text-slate-300">Explore structured lessons, practice materials and live classes.</p><Link href="/courses" className="mt-4 inline-flex rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950">Explore Courses →</Link></section></aside>
          </div> : null}
          </section>
          <section className="mt-7"><div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-300">Learning center</p><h2 className="mt-1 text-xl font-bold tracking-tight text-white">Popular Exam Categories</h2></div><a href="#all-tests" className="text-xs font-semibold text-sky-300 hover:text-white">View all mock tests →</a></div><div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{mockExamCategories.map((group) => { const groupTests = tests.filter((item) => matchesExam(item, group.exam)); const freeCount = groupTests.filter((item) => item.access === "Free").length; const paidCount = groupTests.filter((item) => item.access === "Premium").length; const groupSubjects = [...new Set(groupTests.map((item) => item.subject).filter((value) => value && value !== "Mixed Practice" && value !== "Not specified"))]; const durations = groupTests.map((item) => (/^\d+(?:\.\d+)?\s*min$/i.test(item.duration) ? Number.parseFloat(item.duration) : NaN)).filter(Number.isFinite); const avgDuration = durations.length ? `${Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)} min` : "—"; const groupExpanded = expandedExam === group.exam; const supportedSubExams = (group.subExams || []).filter((subExam) => groupTests.some((test) => matchesExam(test, subExam.name))); const selectedSubExam = supportedSubExams.some((item) => item.name === expandedExam); const panelOpen = groupExpanded || selectedSubExam; const inlineTests = panelOpen ? tests.filter((item) => matchesExam(item, expandedExam)) : []; return <article key={group.exam} className={`overflow-hidden rounded-2xl border bg-[linear-gradient(145deg,#0c1c3b,#07142a)] p-3 shadow-[0_16px_38px_rgba(0,0,0,.16)] transition sm:p-5 ${panelOpen ? "border-cyan-300/45 shadow-[0_20px_50px_rgba(8,145,178,.12)]" : "border-white/[.1] hover:-translate-y-0.5 hover:border-blue-300/35"}`}>{group.logoImage ? <button type="button" aria-label={`Open ${group.exam} mock tests`} aria-expanded={panelOpen} onClick={() => openCategoryMocks(group.exam)} className="mb-3 flex h-16 w-full items-center justify-center overflow-hidden rounded-xl border border-blue-200/10 bg-[radial-gradient(ellipse_at_center,rgba(30,86,160,.22),rgba(5,18,38,.4))] p-2 sm:mb-4 sm:h-24"><Image src={group.logoImage} alt={group.logoAlt || `${group.exam} mock tests`} width={480} height={260} className="h-full w-auto max-w-full rounded-lg bg-white object-contain px-2" /></button> : null}<div className="flex items-center justify-between gap-3"><button type="button" aria-label={`Open ${group.exam} mock tests`} aria-expanded={panelOpen} onClick={() => openCategoryMocks(group.exam)} className="flex min-w-0 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-orange-300/25 bg-orange-500/10 text-orange-100"><Icon name={categoryIconNames[group.exam] || "test"} className="h-5 w-5" /></span><span><span className="block text-[10px] font-bold uppercase tracking-[.2em] text-orange-300">{group.exam}</span><span className="mt-1 block text-2xl font-bold tracking-tight text-white">{groupTests.length} Published tests</span></span></button><span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold text-cyan-100">{group.difficulty}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300 sm:mt-4"><span className="rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-2">Free: <b className="text-white">{freeCount}</b></span><span className="rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-2">Paid: <b className="text-white">{paidCount}</b></span><span className="rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-2">Avg: {avgDuration}</span><span className="rounded-lg border border-white/[.08] bg-white/[.04] px-3 py-2">{group.pattern}</span></div><p className="mt-2 text-xs text-slate-400 sm:mt-3">{groupSubjects.length ? groupSubjects.join(", ") : "Subject details not specified"}</p><div className="mt-3 grid grid-cols-2 gap-1.5 sm:mt-4 sm:gap-2">{supportedSubExams.map((subExam) => { const active = expandedExam === subExam.name; return <button key={subExam.name} type="button" aria-label={`Open ${subExam.name} mock tests`} aria-expanded={active} onClick={() => openCategoryMocks(group.exam, subExam.name)} className={`flex min-w-0 items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition sm:px-2.5 sm:py-2 sm:text-xs ${active ? "border-cyan-300/45 bg-cyan-400/15 text-white" : "border-cyan-300/15 bg-cyan-400/[.07] text-cyan-50 hover:border-cyan-200/35 hover:bg-cyan-400/15"}`}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-orange-300/20 sm:h-7 sm:w-7 bg-orange-500/10 text-orange-100"><Icon name={subExamIconName(subExam.name, group.exam)} className="h-4 w-4" /></span><span className="truncate">{subExam.name}</span></button>; })}</div>{panelOpen ? <div className="mt-4 rounded-xl border border-cyan-300/15 bg-[#06152a]/90 p-3"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-cyan-200">{expandedExam} Mocks</p><span className="text-[10px] text-slate-400">{loading ? "Loading…" : `${inlineTests.length} tests`}</span></div>{inlineTests.length ? <div className="max-h-80 space-y-2 overflow-y-auto pr-1">{inlineTests.map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/[.07] bg-white/[.035] px-3 py-2"><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">{item.title}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{item.exam} · {item.questionCount || "—"} questions · {item.duration}</p></div><Link href={item.href} className="shrink-0 rounded-md bg-cyan-400/15 px-2.5 py-1.5 text-[10px] font-bold text-cyan-100 transition hover:bg-cyan-300/25">Open</Link></div>)}</div> : <p className="rounded-lg bg-white/[.03] px-3 py-3 text-xs text-slate-400">{loading ? "Loading published mocks…" : `No published mocks found for ${expandedExam} yet.`}</p>}</div> : null}</article>; })}</div></section>

          <footer className="mt-8 border-t border-white/10 py-5 text-center text-xs text-slate-500">BADAM TESTRANK — Powered by Badam Classes</footer>
        </main>
      </div>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-sky-400/20 bg-[#020b18]/95 px-2 py-2 backdrop-blur md:hidden">{[{ label: "Home", href: "https://www.badamclasses.in", icon: "home" }, { label: "Courses", href: "/courses", icon: "course" }, { label: "Tests", href: "/test-rank", icon: "test" }, { label: "News", href: "/current-affairs", icon: "news" }, { label: "Profile", href: "/profile", icon: "user" }].map((item) => <Link key={item.label} href={item.href} aria-current={item.label === "Tests" ? "page" : undefined} className={`grid justify-items-center gap-1 text-[10px] font-medium ${item.label === "Tests" ? "text-sky-300" : "text-slate-400"}`}><Icon name={item.icon} className="h-4 w-4" />{item.label}</Link>)}</nav>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#07172e] px-3 py-2 text-[10px] text-slate-400">{label}<select value={value} onChange={(event) => onChange(event.target.value)} aria-label={`Filter by ${label}`} className="min-w-0 bg-transparent text-xs font-medium text-slate-100 outline-none">{options.map((option) => <option className="bg-[#07172e]" key={option}>{option}</option>)}</select></label>;
}
function Detail({ icon, label, value }) { return <div className="min-w-0 rounded-lg bg-white/[.04] p-2.5"><p className="flex min-w-0 items-center gap-1.5 text-[9px] uppercase tracking-wide text-slate-500"><Icon name={icon} className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{label}</span></p><p className="mt-1 break-words font-semibold text-slate-200">{value}</p></div>; }
function SmallStat({ label, value }) { return <div className="rounded-lg border border-white/10 bg-white/[.03] p-2"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></div>; }
