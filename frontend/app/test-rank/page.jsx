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
const testRankHeroBanners = [
  { src: "/test-rank-pyq-mock.webp", alt: "Badam Test Rankers PYQ mock practice with previous year question papers", label: "PYQ Mock", href: "/test-rank?tab=Previous%20Year%20Papers#choose-format", width: 2118, height: 742 },
  { src: "/test-rank-live-mock.webp", alt: "Badam Test Rankers all India live mock test for competitive exam aspirants", label: "Live Mock", href: "/test-rank?mode=timed#choose-format", width: 2120, height: 742 },
  { src: "/test-rank-railway-mock.webp", alt: "RRB mock tests for Railway exam practice on Badam Test Rankers", label: "RRB Mock Tests", href: "/test-rank?exam=Railway#choose-format", width: 2058, height: 764 },
  { src: "/test-rank-ssc-mock.webp", alt: "SSC mock tests and focused exam preparation on Badam Test Rankers", label: "SSC Mock Tests", href: "/test-rank?exam=SSC#choose-format", width: 2118, height: 742 },
  { src: "/test-rank-state-exams.webp", alt: "State exam mock tests for competitive exam preparation on Badam Test Rankers", label: "State Exam Mocks", href: "/test-rank?exam=State%20Exams#choose-format", width: 2040, height: 771 },
  { src: "/test-rank-hero-online-series.png", alt: "Badam Test Rankers online test series for competitive exams with full length mock tests, sectional tests, performance tracking, and analysis", label: "Online test series", width: 1571, height: 412 },
  { src: "/test-rank-hero-cyan.webp", alt: "Badam Test Rankers online test series for SSC, Railway, Banking and Police exams", label: "Blue and cyan", width: 2171, height: 724 },
  { src: "/test-rank-hero-gold.webp", alt: "Badam Test Rankers exam practice banner with blue and gold styling", label: "Blue and gold", width: 2172, height: 724 },
  { src: "/test-rank-welcome-banner.jpg", alt: "Welcome to BadamTest with real exam pattern and smart analysis", label: "Welcome", width: 1024, height: 320 }
];
const mockModes = [{ id: "all", label: "All Mocks", icon: "grid" }, { id: "full", label: "Full Mock", icon: "test" }, { id: "sectional", label: "Sectional Mock", icon: "layers" }, { id: "topic", label: "Topic / Chapter Mock", icon: "book" }, { id: "mini", label: "Mini Mocks", icon: "spark" }, { id: "super", label: "Super Sets", icon: "spark" }, { id: "calci", label: "Ultra Calci", icon: "calculator" }, { id: "timed", label: "Timed Online Tests", icon: "clock" }];
const practiceFormats = [
  { id: "full", title: "Full Length Tests", detail: "Attempt realistic exam simulations and see where you stand.", icon: "test", badge: "EXAM MODE", tone: "blue" },
  { id: "pyq", title: "PYQs", detail: "Practice previous exam questions and understand real trends.", icon: "paper", badge: "PAST PAPERS", tone: "emerald" },
  { id: "super", title: "Super Set Tests", detail: "Curated mixed practice sets for a focused challenge.", icon: "spark", badge: "FEATURED", tone: "violet" },
  { id: "calci", title: "Ultra Calci Tests", detail: "Sharpen calculation speed with short timed drills.", icon: "calculator", badge: "QUICK DRILL", tone: "amber" },
  { id: "sectional", title: "Sectional Tests", detail: "Build confidence one subject at a time.", icon: "layers", badge: "BY SUBJECT", tone: "cyan" },
  { id: "topic", title: "Topic Boost", detail: "Strengthen specific chapters with step-by-step practice.", icon: "book", badge: "TOPIC WISE", tone: "rose" },
  { id: "ai", title: "AI Mock Test", detail: "Practice published topic mocks with smart AI focus guidance.", icon: "spark", badge: "AI PRACTICE", tone: "violet" }
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
    createdAt: item.createdAt || item.publishedAt || item.updatedAt || null,
    bucket: item.testBucket || item.bucketName || item.bucket || "",
    guidance: Boolean(item.topperGuidance || item.guidanceProgram || /topper'?s? guidance/i.test(`${item.title || ""} ${item.type || ""} ${item.source || ""}`)),
    courseId: typeof item.courseId === "string" ? item.courseId : item.courseId?._id || item.courseId?.id || "",
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
  { label: "Mock Tests", href: "/test-rank", icon: "test", active: true, section: "Practice" },
  { label: "Daily Quiz", href: "/mock-tests", icon: "quiz", badge: "NEW", section: "Practice" },
  { label: "Previous Year Papers", href: "/mock-tests", icon: "paper", section: "Practice" },
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

function LiveTestArtwork({ idPrefix }) {
  const rankGradient = `${idPrefix}-live-rank`;
  const platformGradient = `${idPrefix}-live-platform`;
  const orbitGradient = `${idPrefix}-live-orbit`;
  const sweepGradient = `${idPrefix}-live-sweep`;
  const barsClip = `${idPrefix}-live-bars`;

  return (
    <svg className="live-test-artwork" viewBox="0 0 88 76" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={rankGradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8be9ff" />
          <stop offset="0.42" stopColor="#3987ff" />
          <stop offset="1" stopColor="#7148ed" />
        </linearGradient>
        <linearGradient id={platformGradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#91f0ff" />
          <stop offset="0.42" stopColor="#305edb" />
          <stop offset="1" stopColor="#15143f" />
        </linearGradient>
        <linearGradient id={orbitGradient} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4b8dff" stopOpacity="0.08" />
          <stop offset="0.5" stopColor="#a9f4ff" />
          <stop offset="1" stopColor="#946cff" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id={sweepGradient} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={barsClip}>
          <rect x="15" y="42" width="18" height="24" rx="4" />
          <rect x="35" y="29" width="18" height="37" rx="4" />
          <rect x="55" y="47" width="18" height="19" rx="4" />
        </clipPath>
      </defs>

      <ellipse className="live-test-orbit" cx="44" cy="52" rx="37" ry="16" fill="none" stroke={`url(#${orbitGradient})`} strokeWidth="1.2" />
      <ellipse className="live-test-platform" cx="44" cy="67" rx="31" ry="5" fill={`url(#${platformGradient})`} stroke="#83eaff" strokeWidth="1.2" />
      <ellipse cx="44" cy="66" rx="23" ry="2.2" fill="#a48aff" opacity="0.72" />

      <g className="live-test-bars" fill={`url(#${rankGradient})`} stroke="#a6efff" strokeWidth="1">
        <rect className="live-test-bar live-test-bar-one" x="15" y="42" width="18" height="24" rx="4" />
        <rect className="live-test-bar live-test-bar-two" x="35" y="29" width="18" height="37" rx="4" />
        <rect className="live-test-bar live-test-bar-three" x="55" y="47" width="18" height="19" rx="4" />
        <rect className="live-test-sweep" x="12" y="27" width="64" height="40" fill={`url(#${sweepGradient})`} stroke="none" clipPath={`url(#${barsClip})`} />
      </g>

      <g className="live-test-star-float">
        <path className="live-test-star" d="m44 5 4 8.4 9.2 1.3-6.6 6.4 1.6 9.1-8.2-4.3-8.2 4.3 1.6-9.1-6.6-6.4 9.2-1.3L44 5Z" fill="#ffd66e" stroke="#fff3c4" strokeWidth="1.6" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function FormatIcon({ kind }) {
  const icon = kind === "Premium Mock" ? "crown" : kind === "PYQ Mock" ? "paper" : kind === "AI Mock" ? "spark" : "payment";
  const tone = kind === "Premium Mock" ? "premium" : kind === "PYQ Mock" ? "pyq" : kind === "AI Mock" ? "ai" : "paid";

  return <span className={`format-icon-tile format-icon-${tone}`} aria-hidden="true"><Icon name={icon} className="h-7 w-7" /></span>;
}

const categoryIconNames = { Railway: "train", SSC: "test", Banking: "bank", Police: "shield", Teaching: "school", "State Exams": "government" };
const examDashboardCategories = [
  { id: "Railway", label: "Railway", parent: "Railway", terms: ["railway", "rrb"], icon: "train" },
  { id: "SSC", label: "SSC", parent: "SSC", terms: ["ssc"], icon: "test" },
  { id: "Banking", label: "Banking", parent: "Banking", terms: ["bank", "ibps", "sbi", "rbi"], icon: "bank" },
  { id: "Police", label: "Police", parent: "Police", terms: ["police", "constable", "rpf"], icon: "shield" },
  { id: "Teaching", label: "Teaching", parent: "Teaching", terms: ["teaching", "tet", "ctet"], icon: "school" },
  { id: "State Exams", label: "State Exams", parent: "State Exams", terms: ["state", "psc", "bihar exams", "up exams", "mp exams"], icon: "government" },
  { id: "IB", label: "IB", parent: "IB", terms: ["intelligence bureau", "acio"], icon: "government" },
  { id: "UP Police", label: "UP Police", parent: "Police", terms: ["up police", "uttar pradesh police"], icon: "shield" },
  { id: "RPF", label: "RPF", parent: "Railway", terms: ["rpf", "railway protection force"], icon: "shield" },
  { id: "Delhi Police", label: "Delhi Police", parent: "Police", terms: ["delhi police"], icon: "shield" },
  { id: "MP Police", label: "MP Police", parent: "Police", terms: ["mp police", "madhya pradesh police"], icon: "shield" },
  { id: "Bihar Police", label: "Bihar Police", parent: "Police", terms: ["bihar police"], icon: "shield" },
  { id: "Rajasthan Police", label: "Rajasthan Police", parent: "Police", terms: ["rajasthan police"], icon: "shield" },
  { id: "Defence", label: "Defence", parent: "Defence", terms: ["defence", "defense", "nda", "cds", "afcat", "agniveer"], icon: "government" }
];
const examCategoryCardTones = [
  { border: "border-pink-500/65 hover:border-pink-300", glow: "from-pink-600/25", pill: "border-pink-400/40 bg-pink-500/15 text-pink-100", accent: "from-pink-500 to-rose-600" },
  { border: "border-violet-500/65 hover:border-violet-300", glow: "from-violet-600/25", pill: "border-violet-400/40 bg-violet-500/15 text-violet-100", accent: "from-violet-500 to-indigo-600" },
  { border: "border-teal-400/60 hover:border-teal-200", glow: "from-teal-500/25", pill: "border-teal-300/40 bg-teal-500/15 text-teal-100", accent: "from-teal-400 to-cyan-600" },
  { border: "border-blue-500/65 hover:border-cyan-300", glow: "from-blue-600/25", pill: "border-blue-400/40 bg-blue-500/15 text-blue-100", accent: "from-cyan-400 to-blue-600" },
  { border: "border-amber-400/60 hover:border-amber-200", glow: "from-amber-500/25", pill: "border-amber-300/40 bg-amber-500/15 text-amber-100", accent: "from-amber-400 to-orange-600" },
  { border: "border-fuchsia-500/60 hover:border-fuchsia-300", glow: "from-fuchsia-600/25", pill: "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100", accent: "from-violet-400 to-fuchsia-600" }
];
const testSeriesByCategory = {
  Railway: [
    { id: "rrb-ntpc", name: "RRB NTPC Mock Test Series", terms: ["ntpc"] },
    { id: "rrb-group-d", name: "RRB Group D Mock Test Series", terms: ["group d"] },
    { id: "rrb-alp", name: "RRB ALP Mock Test Series", terms: ["alp"] },
    { id: "rrb-technician", name: "RRB Technician Mock Test Series", terms: ["technician"] },
    { id: "rpf-series", name: "RPF Mock Test Series", terms: ["rpf"] }
  ],
  SSC: [
    { id: "ssc-cgl-tier-1", name: "SSC CGL Tier-1 Mock Test Series", terms: ["cgl"], exclude: ["tier 2", "tier-2"] },
    { id: "ssc-cgl-tier-2", name: "SSC CGL Tier-2 Mock Test Series", terms: ["cgl", "tier 2"] },
    { id: "ssc-chsl-tier-1", name: "SSC CHSL Tier-1 Mock Test Series", terms: ["chsl"], exclude: ["tier 2", "tier-2"] },
    { id: "ssc-chsl-tier-2", name: "SSC CHSL Tier-2 Mock Test Series", terms: ["chsl", "tier 2"] },
    { id: "ssc-cpo-tier-1", name: "SSC CPO Tier-1 Mock Test Series", terms: ["cpo"], exclude: ["tier 2", "tier-2"] },
    { id: "ssc-cpo-tier-2", name: "SSC CPO Tier-2 Mock Test Series", terms: ["cpo", "tier 2"] },
    { id: "ssc-selection-post", name: "SSC Selection Post Mock Test Series", terms: ["selection post"] },
    { id: "ssc-mts", name: "SSC MTS Mock Test Series", terms: ["mts"] }
  ],
  Banking: [
    { id: "ibps-po", name: "IBPS PO Test Series", terms: ["ibps po"] },
    { id: "ibps-clerk", name: "IBPS Clerk Test Series", terms: ["ibps clerk"] },
    { id: "sbi-po", name: "SBI PO Test Series", terms: ["sbi po"] },
    { id: "sbi-clerk", name: "SBI Clerk Test Series", terms: ["sbi clerk"] },
    { id: "rbi-assistant", name: "RBI Assistant Test Series", terms: ["rbi assistant"] },
    { id: "ibps-rrb", name: "IBPS RRB Test Series", terms: ["ibps rrb"] }
  ],
  Police: [
    { id: "up-police", name: "UP Police Test Series", terms: ["up police", "uttar pradesh police"] },
    { id: "rpf", name: "RPF Test Series", terms: ["rpf"] },
    { id: "delhi-police", name: "Delhi Police Test Series", terms: ["delhi police"] },
    { id: "mp-police", name: "MP Police Test Series", terms: ["mp police", "madhya pradesh police"] },
    { id: "bihar-police", name: "Bihar Police Test Series", terms: ["bihar police"] },
    { id: "rajasthan-police", name: "Rajasthan Police Test Series", terms: ["rajasthan police"] }
  ],
  Teaching: [
    { id: "ctet", name: "CTET Paper I & II Test Series", terms: ["ctet"] },
    { id: "uptet", name: "UPTET Test Series", terms: ["uptet"] },
    { id: "reet", name: "REET Test Series", terms: ["reet"] },
    { id: "tgt-pgt", name: "TGT / PGT Test Series", terms: ["tgt", "pgt"] }
  ],
  "State Exams": [
    { id: "up-exams", name: "UP State Exams Test Series", terms: ["up exams", "uttar pradesh"] },
    { id: "mp-exams", name: "MP State Exams Test Series", terms: ["mp exams", "madhya pradesh"] },
    { id: "bihar-exams", name: "Bihar State Exams Test Series", terms: ["bihar"] },
    { id: "state-psc", name: "State PSC Test Series", terms: ["psc"] }
  ],
  IB: [{ id: "ib-acio-tier-1", name: "IB ACIO Tier-I Test Series", terms: ["acio"] }, { id: "ib-acio-tier-2", name: "IB ACIO Tier-II Test Series", terms: ["acio", "tier 2"] }],
  "UP Police": [{ id: "up-constable", name: "UP Police Constable Test Series", terms: ["up police", "constable"] }, { id: "up-si", name: "UP Police SI Test Series", terms: ["up police", "si"] }],
  RPF: [{ id: "rpf-constable", name: "RPF Constable Test Series", terms: ["rpf", "constable"] }, { id: "rpf-si", name: "RPF SI Test Series", terms: ["rpf", "si"] }],
  "Delhi Police": [{ id: "delhi-constable", name: "Delhi Police Constable Test Series", terms: ["delhi police", "constable"] }, { id: "delhi-si", name: "Delhi Police SI Test Series", terms: ["delhi police", "si"] }],
  "MP Police": [{ id: "mp-constable", name: "MP Police Constable Test Series", terms: ["mp police", "constable"] }, { id: "mp-si", name: "MP Police SI Test Series", terms: ["mp police", "si"] }],
  "Bihar Police": [{ id: "bihar-constable", name: "Bihar Police Constable Test Series", terms: ["bihar police", "constable"] }, { id: "bihar-si", name: "Bihar Police SI Test Series", terms: ["bihar police", "si"] }],
  "Rajasthan Police": [{ id: "rajasthan-constable", name: "Rajasthan Police Constable Test Series", terms: ["rajasthan police", "constable"] }, { id: "rajasthan-si", name: "Rajasthan Police SI Test Series", terms: ["rajasthan police", "si"] }],
  Defence: [{ id: "nda", name: "NDA Test Series", terms: ["nda"] }, { id: "cds", name: "CDS Test Series", terms: ["cds"] }, { id: "afcat", name: "AFCAT Test Series", terms: ["afcat"] }]
};
const cleanTestSearch = (value) => String(value || "").toLowerCase().replace(/[_-]+/g, " ").replace(/\btier\s+ii\b/g, "tier 2").replace(/\btier\s+i\b/g, "tier 1").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const matchesSeries = (test, series) => {
  const text = cleanTestSearch(`${test.title} ${test.examSearchText} ${test.type} ${test.subject} ${test.bucket}`);
  return series.terms.every((term) => text.includes(cleanTestSearch(term))) && !(series.exclude || []).some((term) => text.includes(cleanTestSearch(term)));
};
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
  const [selectedFormat, setSelectedFormat] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [heroBannerIndex, setHeroBannerIndex] = useState(0);
  const [activeDashboardCategory, setActiveDashboardCategory] = useState("");
  const [activeDashboardSeries, setActiveDashboardSeries] = useState("");
  const [dashboardTab, setDashboardTab] = useState("Mock Tests");
  const [dashboardFilter, setDashboardFilter] = useState("All");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setHeroBannerIndex((index) => (index + 1) % testRankHeroBanners.length);
      }
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, []);
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
  const chooseExamCategory = (categoryId) => {
    const category = examDashboardCategories.find((item) => item.id === categoryId);
    if (!category) return;
    setActiveDashboardCategory(category.id);
    setActiveDashboardSeries(testSeriesByCategory[category.id]?.[0]?.id || "");
    setExam(category.parent);
    setSubExam(category.id === category.parent ? "" : category.label);
    setTab("All Tests");
    setMockMode("all");
    setSubject("All subjects");
    setDifficulty("All levels");
    setLanguage("All languages");
    setSearch("");
    setDashboardTab("Mock Tests");
    setDashboardFilter("All");
    setExpandedExam(category.label);
    setSelectedFormat("full");
    setPageSize(5);
    const params = new URLSearchParams({ exam: category.parent });
    if (category.id !== category.parent) params.set("subExam", category.label);
    window.history.pushState(null, "", `/test-rank?${params.toString()}#category-dashboard`);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.setTimeout(() => document.getElementById("category-dashboard")?.scrollIntoView({ behavior, block: "start" }), 0);
  };
  const openCategoryMocks = (category, selectedSubExam = "") => {
    const targetCategory = examDashboardCategories.find((item) => item.id === (selectedSubExam || category) || item.label === (selectedSubExam || category));
    if (targetCategory) {
      chooseExamCategory(targetCategory.id);
      return;
    }
    setExam(category);
    setSubExam(selectedSubExam);
    setTab("All Tests");
    setMockMode("all");
    setSubject("All subjects");
    setDifficulty("All levels");
    setLanguage("All languages");
    setSearch("");
    setDashboardTab("Mock Tests");
    setDashboardFilter("All");
    const params = new URLSearchParams({ exam: targetCategory?.parent || category });
    if (targetCategory && targetCategory.id !== targetCategory.parent) params.set("subExam", targetCategory.label);
    else if (selectedSubExam) params.set("subExam", selectedSubExam);
    window.history.pushState(null, "", `/test-rank?${params.toString()}#category-dashboard`);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.setTimeout(() => document.getElementById("category-dashboard")?.scrollIntoView({ behavior, block: "start" }), 0);
  };
  const chooseTestSeries = (seriesId) => {
    setActiveDashboardSeries(seriesId);
    setDashboardTab("Mock Tests");
    setDashboardFilter("All");
    setPageSize(5);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.setTimeout(() => document.getElementById("category-test-list")?.scrollIntoView({ behavior, block: "nearest" }), 0);
  };
  const selectFormat = (format) => {
    setSelectedFormat((current) => current === format ? "" : format);
    setExam("All exams"); setSubExam(""); setSubject("All subjects"); setDifficulty("All levels"); setLanguage("All languages"); setSearch(""); setExpandedExam(""); setPageSize(5);
    if (format === "pyq") { setTab("Previous Year Papers"); setMockMode("all"); }
    else { setTab("All Tests"); setMockMode(format); }
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.setTimeout(() => document.getElementById("choose-format")?.scrollIntoView({ block: "start", behavior }), 0);
  };
  const scrollToMockTests = (event, freeOnly = false) => {
    event.preventDefault();
    setTab(freeOnly ? "Free Tests" : "All Tests");
    setExam("All exams");
    setSubExam("");
    setMockMode("all");
    setSearch("");
    setSelectedFormat("full");
    setPageSize(5);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const targetUrl = new URL(window.location.href);
    targetUrl.hash = "mock-tests";
    window.history.replaceState(null, "", targetUrl);
    document.getElementById("mock-tests")?.scrollIntoView({ behavior, block: "start" });
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
      if (window.location.hash === "#test-library") {
        window.history.replaceState(null, "", `/test-rank${window.location.search}#choose-format`);
      }
      const matchedCategory = mockExamCategories.find((category) => category.exam === requestedExam || category.subExams?.some((item) => item.name === requestedSubExam));
      const dashboardCategory = examDashboardCategories.find((category) => category.id === requestedSubExam || category.id === requestedExam);
      const validExam = requestedExam && (requestedExam === "All exams" || mockExamCategories.some((category) => category.exam === requestedExam) || dashboardCategory);
      const inlineCategoryView = window.location.hash === "#popular-exams" && Boolean(matchedCategory);
      setActiveDashboardCategory(dashboardCategory?.id || "");
      setActiveDashboardSeries(dashboardCategory ? (testSeriesByCategory[dashboardCategory.id]?.[0]?.id || "") : "");
      setDashboardTab(requestedTab === "Previous Year Papers" ? "Previous Year Papers" : "Mock Tests");
      setDashboardFilter("All");
      setExam(dashboardCategory ? dashboardCategory.parent : inlineCategoryView ? matchedCategory.exam : validExam ? requestedExam : "All exams");
      setSubExam(dashboardCategory && dashboardCategory.id !== dashboardCategory.parent ? dashboardCategory.label : matchedCategory?.subExams?.some((item) => item.name === requestedSubExam) ? requestedSubExam : "");
      setExpandedExam(inlineCategoryView ? requestedSubExam || matchedCategory.exam : "");
      setMockMode(mockModes.some((mode) => mode.id === requestedMode) ? requestedMode : "all");
      setTab(tabs.includes(requestedTab) ? requestedTab : "All Tests");
      if (!inlineCategoryView && (requestedExam || requestedSubExam)) {
        setExpandedExam(requestedSubExam || requestedExam);
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
      || (mockMode === "calci" && /ultra\s*calci|calculat|arithmetic drill/i.test(modeText))
      || (mockMode === "ai" && item.source === "Badam Classes practice" && item.type === "Topic / Chapter Mock");
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
  const activeExamCategory = examDashboardCategories.find((category) => category.id === activeDashboardCategory) || null;
  const dashboardSeries = activeExamCategory ? (testSeriesByCategory[activeExamCategory.id] || [{ id: `${activeExamCategory.id}-all`, name: `${activeExamCategory.label} Test Series`, terms: activeExamCategory.terms }]) : [];
  const dashboardCategoryTests = useMemo(() => {
    if (!activeExamCategory) return [];
    return tests.filter((test) => {
      const text = cleanTestSearch(`${test.title} ${test.examSearchText} ${test.type} ${test.subject}`);
      return activeExamCategory.terms.some((term) => text.includes(cleanTestSearch(term)));
    });
  }, [tests, activeExamCategory]);
  const dashboardSeriesCounts = useMemo(() => dashboardSeries.map((series) => {
    const seriesTests = dashboardCategoryTests.filter((test) => matchesSeries(test, series));
    return { ...series, tests: seriesTests, total: seriesTests.length, free: seriesTests.filter((test) => test.access === "Free").length, paid: seriesTests.filter((test) => test.access === "Premium").length };
  }), [dashboardSeries, dashboardCategoryTests]);
  const selectedDashboardSeries = dashboardSeriesCounts.find((series) => series.id === activeDashboardSeries) || dashboardSeriesCounts[0] || null;
  const previousYearTest = (test) => test.type === "Previous Year Papers" || /pyq|previous year|past paper/i.test(`${test.title} ${test.type} ${test.source}`);
  const currentSeriesTests = selectedDashboardSeries?.tests || dashboardCategoryTests;
  const mockDashboardTests = currentSeriesTests.filter((test) => !previousYearTest(test));
  const previousYearDashboardTests = currentSeriesTests.filter(previousYearTest);
  const dashboardTabTests = dashboardTab === "Previous Year Papers" ? previousYearDashboardTests : mockDashboardTests;
  const dashboardVisibleTests = useMemo(() => {
    let results = dashboardTabTests;
    if (dashboardFilter === "Free") results = results.filter((test) => test.access === "Free");
    if (dashboardFilter === "Test Bucket") results = results.filter((test) => Boolean(test.bucket));
    if (dashboardFilter === "Topper's Guidance Program") results = results.filter((test) => test.guidance);
    if (dashboardFilter === "Latest Tests") results = [...results].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return results;
  }, [dashboardTabTests, dashboardFilter]);
  const average = history.length ? Math.round(history.reduce((sum, item) => sum + Number(item.percent || 0), 0) / history.length) : null;
  const completionProgress = tests.length ? Math.min(100, Math.round((history.length / tests.length) * 100)) : 0;
  const best = history.length ? Math.max(...history.map((item) => Number(item.scorePercent || 0))) : null;
  const averageTimePerQuestion = history.length ? Math.round(history.reduce((sum, item) => sum + Number(item.result?.timeTakenSeconds || 0) / Math.max(1, item.questionCount), 0) / history.length) : null;

  return (
    <div className="min-h-screen bg-[#030d1b] text-slate-100 md:flex">
      {mobileSidebarOpen ? <button type="button" aria-label="Close navigation menu" onClick={() => setMobileSidebarOpen(false)} className="fixed inset-0 z-[45] bg-black/60 backdrop-blur-[2px] md:hidden" /> : null}
      <button type="button" aria-label={mobileSidebarOpen ? "Hide navigation menu" : "Show navigation menu"} aria-expanded={mobileSidebarOpen} aria-controls="test-rank-sidebar" onClick={() => setMobileSidebarOpen((open) => !open)} className="tr-mobile-menu fixed right-3 top-3 z-[60] grid h-10 w-10 place-items-center rounded-xl border border-sky-200/25 bg-[#0a1c34] text-sky-100 shadow-lg shadow-black/40 transition hover:bg-[#123054] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 md:hidden">{mobileSidebarOpen ? "×" : "☰"}</button>
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

      <div className="tr-mobile-shell min-w-0 flex-1 md:ml-64">
        <header className="tr-mobile-header relative z-40 border-b border-sky-400/15 bg-[#020b18]/95 px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,.18)] backdrop-blur-xl md:sticky md:top-0 md:px-7 md:py-3">
          <div className="space-y-4 md:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="https://www.badamclasses.in" className="flex min-w-0 items-center gap-2.5" aria-label="Badam TestRank home">
                <Image src="/new-logo.webp" alt="Badam Classes" width={1536} height={1024} className="h-10 w-12 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0"><span className="block truncate text-[10px] font-bold uppercase tracking-[.14em] text-sky-300">Badam Classes</span><span className="block truncate text-base font-extrabold leading-tight text-white">TestRank</span></span>
              </Link>
              <div className="flex shrink-0 items-center gap-1"><button type="button" aria-label="Focus test search" onClick={() => document.querySelector('[aria-label="Search tests and topics"]')?.focus()} className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10"><Icon name="search" className="h-5 w-5" /></button><Link href="/dashboard" aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10"><Icon name="bell" className="h-5 w-5" /></Link><Link href={student ? "/profile" : "/login"} aria-label={student ? "Open profile" : "Log in"} className="grid h-10 w-10 place-items-center rounded-full border border-sky-200/30 bg-blue-500/20 text-sm font-bold text-white">{student?.name?.[0]?.toUpperCase() || <Icon name="user" className="h-5 w-5" />}</Link></div>
            </div>
            <div className="tr-mobile-welcome"><span className="block text-xs text-blue-100">Good to see you,</span><h1 className="text-lg font-bold leading-tight text-white">{student?.name || "Learner"} <span aria-hidden="true">👋</span></h1></div>
            <nav aria-label="TestRank sections" className="tr-desktop-switch relative isolate hidden grid-cols-2 rounded-full border border-violet-400/40 bg-[#070810] p-1 shadow-[0_0_20px_rgba(91,33,182,.2)]">
              <span aria-hidden="true" className="nav-switch-indicator nav-switch-rank absolute inset-y-1 left-1 z-0 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-violet-700 to-indigo-600 shadow-md shadow-violet-950/50" />
              <a href="https://www.badamclasses.in" className="relative z-10 flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 text-[11px] font-semibold tracking-tight text-slate-300 transition-colors duration-300 hover:text-white sm:gap-2 sm:px-3 sm:text-sm"><Icon name="home" className="h-4 w-4 shrink-0" />Badam Classes</a>
              <a href="/test-rank" aria-current="page" className="relative z-10 flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 text-[11px] font-bold tracking-tight text-white transition-colors duration-300 sm:gap-2 sm:px-3 sm:text-sm"><Icon name="chart" className="h-4 w-4 shrink-0" />BadamTestRanker</a>
            </nav>
            <nav aria-label="Mobile TestRank navigation" className="tr-mobile-topnav flex items-center gap-5 overflow-x-auto border-b border-white/10 pb-2 text-xs font-semibold text-slate-300">
              <Link className="shrink-0 text-orange-300" href="/test-rank">Home</Link><Link className="shrink-0" href="/test-rank#choose-format">Test Series</Link><Link className="shrink-0" href="/test-rank?mode=timed#choose-format">Live Test</Link><Link className="shrink-0" href="/mock-tests/free-practice">Free Test</Link><Link className="shrink-0" href="/class-pdfs">Study Material</Link><Link className="shrink-0" href="/about">About Us</Link>
            </nav>
            <label className="flex w-full items-center gap-2 rounded-xl border border-blue-300/20 bg-[#071a33] px-3.5 py-2.5 shadow-inner shadow-blue-950/40"><Icon name="search" className="h-[18px] w-[18px] shrink-0 text-sky-300" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tests, exams and subjects" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" aria-label="Search tests and topics" /></label>
          </div>
          <div className="hidden w-full items-center justify-between gap-3 md:flex">
            <label className="flex w-full items-center gap-2 rounded-full border border-blue-400/25 bg-[#071a33] px-4 py-2.5 shadow-inner shadow-blue-950/50 md:ml-7 md:max-w-2xl"><Icon name="search" className="h-[18px] w-[18px] shrink-0 text-sky-300" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tests, exams and subjects" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" aria-label="Search tests and topics" /><kbd className="hidden rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400 sm:block">⌘ K</kbd></label>
            <div className="ml-auto flex items-center gap-3"><span className="hidden text-right sm:block"><b className="block text-xs text-white">{student?.name || "Student"}</b><small className="text-[10px] text-slate-400">Student</small></span><span className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/20 text-sm font-semibold">{student?.name?.[0]?.toUpperCase() || <Icon name="user" className="h-4 w-4" />}</span><Link href={student ? "/profile" : "/login"} className="text-slate-400" aria-label={student ? "Open profile" : "Log in"}>⌄</Link></div>
          </div>
          <nav aria-label="TestRank sections" className="relative isolate mx-auto mt-3 hidden w-full max-w-[520px] grid-cols-2 rounded-full border border-violet-400/35 bg-[#070810] p-1 shadow-[0_0_24px_rgba(91,33,182,.18)] md:grid">
            <span aria-hidden="true" className="nav-switch-indicator nav-switch-rank absolute inset-y-1 left-1 z-0 w-[calc(50%-4px)] rounded-full bg-gradient-to-r from-violet-700 to-indigo-600 shadow-md shadow-violet-950/50" />
            <a href="https://www.badamclasses.in" className="relative z-10 flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-slate-300 transition-colors duration-300 hover:text-white"><Icon name="home" className="h-4 w-4" />Badam Classes</a>
            <a href="/test-rank" aria-current="page" className="relative z-10 flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold text-white transition-colors duration-300"><Icon name="chart" className="h-4 w-4" />BadamTestRanker</a>
          </nav>
        </header>

        <main className="tr-mobile-main mx-auto max-w-[1600px] p-4 pb-24 text-slate-100 sm:p-6 lg:p-7">
          <p className="mb-4 hidden text-xs font-medium text-slate-400 sm:block"><Link href="https://www.badamclasses.in" className="transition hover:text-white">Home</Link><span className="mx-2 text-slate-600">/</span><span className="text-sky-200">Badam TestRank</span></p>
          <section aria-labelledby="testrank-hero-title" className="relative isolate grid min-w-0 gap-5 overflow-hidden rounded-[28px] border border-violet-100 bg-[radial-gradient(ellipse_at_84%_22%,rgba(145,115,255,.18),transparent_37%),radial-gradient(ellipse_at_15%_100%,rgba(87,164,255,.14),transparent_38%),linear-gradient(135deg,#fff 0%,#f8f6ff 48%,#eef5ff 100%)] p-5 text-slate-900 shadow-[0_24px_70px_rgba(25,37,80,.16)] sm:gap-8 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,.95fr)] lg:items-center lg:p-12">
            <div className="relative z-10 min-w-0 py-1 sm:py-3">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.13em] text-violet-700 shadow-sm sm:text-xs"><span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-[10px] text-white">B</span> Badam TestRank · Practice smart. Rank higher.</p>
              <h1 id="testrank-hero-title" className="max-w-[15ch] text-[clamp(2.25rem,7vw,4.4rem)] font-extrabold leading-[1.04] tracking-[-.045em] text-[#17172b]">Preparation se <span className="bg-gradient-to-r from-blue-700 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">Selection</span> Tak</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-7">Practice with real exam-pattern mock tests, daily quizzes and smart performance analysis to achieve your selection.</p>
              <div className="mt-6 flex flex-col gap-3 min-[420px]:flex-row sm:mt-7">
                <a href="#mock-tests" onClick={(event) => scrollToMockTests(event, true)} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-700 to-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(79,70,229,.27)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(79,70,229,.34)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 motion-reduce:transform-none">Start Free <span aria-hidden="true" className="text-lg">→</span></a>
                <a href="#mock-tests" onClick={(event) => scrollToMockTests(event)} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-violet-200 bg-white/85 px-5 py-3 text-sm font-bold text-violet-800 shadow-sm transition hover:border-violet-300 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200">Explore Mock Tests</a>
              </div>
              <div className="mt-7 grid max-w-lg grid-cols-3 gap-2 border-y border-violet-100 py-4 sm:mt-8 sm:gap-5 sm:py-5">
                {[{ value: "5M+", label: "aspirants" }, { value: loading ? "…" : tests.length.toLocaleString("en-IN"), label: "mock tests" }, { value: "6", label: "exam categories" }].map((item) => <div key={item.label} className="min-w-0"><p className="truncate text-lg font-extrabold tracking-tight text-[#1d2250] sm:text-2xl">{item.value}</p><p className="mt-0.5 text-[10px] font-medium text-slate-500 sm:text-xs">{item.label}</p></div>)}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2 sm:mt-5 sm:gap-3" aria-label="Popular exam categories">
                {["Railway", "SSC", "Banking", "Police", "Teaching", "State Exams"].map((name) => <button key={name} type="button" onClick={() => openCategoryMocks(name)} aria-label={`Browse ${name} mock tests`} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white bg-white/85 px-2.5 text-[10px] font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:px-3 sm:text-xs"><Icon name={categoryIconNames[name]} className="h-4 w-4 text-violet-600" />{name}</button>)}
              </div>
            </div>

            <div aria-hidden="true" className="relative mx-auto min-h-[265px] w-full max-w-[540px] min-w-0 sm:min-h-[340px] lg:min-h-[400px]">
              <div className="absolute inset-x-3 bottom-3 top-5 rounded-[32px] bg-gradient-to-br from-blue-200/60 via-violet-200/60 to-fuchsia-100/70 blur-2xl sm:inset-x-8 sm:bottom-5 sm:top-8" />
              <div className="absolute inset-x-2 top-3 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_20px_55px_rgba(37,45,90,.16)] sm:inset-x-7 sm:top-6 sm:rounded-[24px] sm:p-5">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4"><div className="flex min-w-0 items-center gap-2.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Icon name="test" className="h-5 w-5" /></span><span><b className="block text-xs font-extrabold text-slate-800 sm:text-sm">Mock Test Preview</b><small className="text-[10px] text-slate-500">SSC CGL · Full length</small></span></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold text-emerald-700 sm:text-[10px]">FREE TEST</span></div>
                <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-semibold text-slate-500 sm:mt-4 sm:text-xs"><span>Question 12 of 100</span><span>⏱ 01:24:36</span></div>
                <p className="mt-2 text-xs font-bold leading-5 text-slate-800 sm:mt-3 sm:text-sm">If 3x + 7 = 25, what is the value of x?</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-2.5">{["A · 4", "B · 6", "C · 8", "D · 9"].map((option, index) => <span key={option} className={`rounded-lg border px-2.5 py-2 text-[10px] font-semibold sm:px-3 sm:py-2.5 sm:text-xs ${index === 1 ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-100 bg-slate-50 text-slate-600"}`}>{option}</span>)}</div>
                <div className="mt-3 flex items-center justify-between sm:mt-4"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full w-[42%] rounded-full bg-gradient-to-r from-blue-600 to-violet-500" /></span><span className="ml-3 text-[9px] font-bold text-slate-500">42%</span></div>
              </div>
              <div className="absolute bottom-0 right-0 w-[54%] rounded-2xl border border-white/90 bg-white p-3 shadow-[0_18px_40px_rgba(37,45,90,.18)] sm:bottom-1 sm:right-0 sm:rounded-[22px] sm:p-4">
                <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-extrabold text-slate-700 sm:text-xs">Performance</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700 sm:text-[9px]">+18.6%</span></div>
                <div className="mt-3 flex h-14 items-end gap-1 sm:mt-4 sm:h-[74px] sm:gap-1.5">{[32, 48, 40, 61, 51, 78, 68, 94].map((height, index) => <span key={index} className={`flex-1 rounded-t-sm ${index === 7 ? "bg-gradient-to-t from-violet-700 to-blue-500" : "bg-violet-100"}`} style={{ height: `${height}%` }} />)}</div>
                <div className="mt-2 flex items-center justify-between text-[8px] font-medium text-slate-400 sm:text-[9px]"><span>Last 8 attempts</span><span className="font-bold text-violet-700">Track your progress</span></div>
              </div>
              <div className="absolute bottom-[35%] left-0 flex items-center gap-2 rounded-xl border border-white/90 bg-white px-2.5 py-2 shadow-[0_12px_32px_rgba(37,45,90,.14)] sm:bottom-[32%] sm:left-0 sm:gap-2.5 sm:rounded-2xl sm:px-3.5 sm:py-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700 sm:h-10 sm:w-10 sm:rounded-xl"><Icon name="crown" className="h-4 w-4 sm:h-5 sm:w-5" /></span><span><b className="block text-[10px] text-slate-800 sm:text-xs">Smart analysis</b><small className="text-[8px] text-slate-500 sm:text-[9px]">Know your next step</small></span></div>
            </div>
          </section>

          <section aria-label="Badam TestRank exam banners" className="mt-5 overflow-hidden rounded-2xl border border-blue-200/20 bg-[#061a39] shadow-[0_22px_60px_rgba(0,0,0,.32)] sm:mt-6">
            <Link href={testRankHeroBanners[heroBannerIndex].href || "#choose-format"} aria-label={`Explore mock tests — ${testRankHeroBanners[heroBannerIndex].label} banner`} className="group block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200">
              <Image src={testRankHeroBanners[heroBannerIndex].src} alt={testRankHeroBanners[heroBannerIndex].alt} width={testRankHeroBanners[heroBannerIndex].width} height={testRankHeroBanners[heroBannerIndex].height} priority sizes="(max-width: 768px) 100vw, 1600px" className="h-[150px] max-h-none w-full object-cover object-left transition-transform duration-500 group-hover:scale-[1.005] sm:h-auto sm:max-h-[560px] sm:object-center" />
            </Link>
            <div className="flex items-center justify-center border-t border-white/10 bg-[#061a39] px-3 py-2">
              <div role="group" aria-label="Choose banner slide" className="flex items-center justify-center gap-2">
                {testRankHeroBanners.map((banner, index) => <button key={banner.src} type="button" aria-label={`Show ${banner.label} banner`} aria-pressed={heroBannerIndex === index} onClick={() => setHeroBannerIndex(index)} className={`h-2.5 w-2.5 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061a39] ${heroBannerIndex === index ? "bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]" : "bg-slate-500 hover:bg-slate-300"}`} />)}
              </div>
            </div>
          </section>

          <section id="exam-categories" aria-labelledby="exam-categories-title" className="relative mt-6 overflow-hidden rounded-[24px] border border-blue-400/20 bg-[#020c22] p-4 text-white shadow-[0_24px_64px_rgba(1,8,28,.36)] sm:p-5 lg:p-6">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_8%_0%,rgba(37,99,235,.24),transparent_38%),radial-gradient(ellipse_at_95%_90%,rgba(79,70,229,.2),transparent_40%)]" />
            <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
              <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-cyan-300">Find your exam</p><h2 id="exam-categories-title" className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl">Popular Exam Categories</h2></div>
              <span className="text-xs text-blue-100/65">Choose a category to explore its test series</span>
            </div>
            <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
              {examDashboardCategories.map((category, index) => {
                const parentInfo = mockExamCategories.find((item) => item.exam === category.parent) || mockExamCategories.find((item) => item.exam === category.label);
                const categoryTests = tests.filter((test) => category.terms.some((term) => cleanTestSearch(`${test.title} ${test.examSearchText}`).includes(cleanTestSearch(term))));
                const freeCount = categoryTests.filter((test) => test.access === "Free").length;
                const paidCount = categoryTests.filter((test) => test.access === "Premium").length;
                const tone = examCategoryCardTones[index % examCategoryCardTones.length];
                const active = activeDashboardCategory === category.id;
                return <button key={category.id} type="button" onClick={() => openCategoryMocks(category.id)} aria-pressed={active} className={`group relative isolate flex min-h-[220px] min-w-0 flex-col overflow-hidden rounded-[20px] border bg-gradient-to-br from-[#111833] via-[#0a1736] to-[#06142d] p-4 text-left shadow-[0_16px_36px_rgba(0,0,0,.25)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(0,0,0,.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020c22] sm:p-5 ${tone.border} ${active ? "ring-2 ring-cyan-300/75" : ""}`}>
                  <span aria-hidden="true" className={`pointer-events-none absolute inset-0 z-0 bg-gradient-to-br ${tone.glow} via-transparent to-transparent opacity-80`} />
                  {parentInfo?.logoImage ? <Image src={parentInfo.logoImage} alt="" aria-hidden="true" width={150} height={150} className="pointer-events-none absolute bottom-8 right-0 z-0 h-32 w-32 object-contain opacity-[.16] transition duration-300 group-hover:scale-105 group-hover:opacity-25 sm:h-36 sm:w-36" /> : null}
                  <span className="relative z-10 flex w-full items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-white/30 bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,.25)] sm:h-16 sm:w-16">
                        {parentInfo?.logoImage ? <Image src={parentInfo.logoImage} alt="" aria-hidden="true" width={52} height={52} className="h-full w-full object-contain" /> : <Icon name={category.icon} className="h-7 w-7 text-blue-700" />}
                      </span>
                      <span className="min-w-0"><span className="block truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">{category.label}</span><span className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-blue-100/80"><Icon name="test" className="h-3.5 w-3.5 shrink-0" />{loading ? "Loading tests…" : `${categoryTests.length} available tests`}</span></span>
                    </span>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[9px] font-extrabold sm:text-[10px] ${tone.pill}`}>{parentInfo?.difficulty || "Exam Level"}</span>
                  </span>
                  <span className="relative z-10 mt-4 flex flex-wrap gap-2">
                    {[{ label: "Free", value: freeCount, icon: "gift" }, { label: "Paid", value: paidCount, icon: "payment" }, { label: parentInfo?.duration || "Exam", value: parentInfo?.pattern || "Exam pattern", icon: "clock" }].map((item) => <span key={item.label} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-black/15 px-2.5 py-1.5 text-[10px] text-white/75"><Icon name={item.icon} className="h-4 w-4 shrink-0 text-white/85" /><span><span className="block font-semibold">{item.label}</span><b className="text-xs text-white">{item.value}</b></span></span>)}
                  </span>
                  <span className="relative z-10 mt-3 line-clamp-1 text-[10px] font-medium text-blue-100/75 sm:text-[11px]">{parentInfo?.sections || "Explore available exam mock tests"}</span>
                  <span className={`relative z-10 mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-xs font-extrabold text-white shadow-lg transition group-hover:brightness-110 sm:text-sm ${tone.accent}`}>Explore mocks <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                </button>;
              })}
            </div>
          </section>

          {activeExamCategory ? <section id="category-dashboard" aria-labelledby="category-dashboard-title" className="mt-5 scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-900 shadow-[0_18px_48px_rgba(15,23,42,.08)] sm:p-4 md:scroll-mt-28">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-violet-700">Selected exam</p><h2 id="category-dashboard-title" className="mt-0.5 text-lg font-extrabold text-slate-900">{activeExamCategory.label} Test Series</h2></div>
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800">{dashboardCategoryTests.length} published tests</span>
            </div>
            <div className="mb-4 grid gap-3 lg:hidden sm:grid-cols-2">
              <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Exam category<select value={activeDashboardCategory} onChange={(event) => openCategoryMocks(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">{examDashboardCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
              <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 xl:hidden">Test series<select value={selectedDashboardSeries?.id || ""} onChange={(event) => chooseTestSeries(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">{dashboardSeries.map((series) => <option key={series.id} value={series.id}>{series.name}</option>)}</select></label>
            </div>

            <div className="grid min-w-0 gap-3 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[190px_235px_minmax(0,1fr)]">
              <aside aria-label="Exam categories" className="hidden min-w-0 rounded-xl border border-slate-200 bg-white p-3 lg:block">
                <h3 className="mb-2 px-1 text-xs font-extrabold text-slate-800">Exam Categories</h3>
                <nav className="max-h-[560px] space-y-1 overflow-y-auto pr-1">
                  {examDashboardCategories.map((category) => <button key={category.id} type="button" onClick={() => openCategoryMocks(category.id)} aria-current={activeDashboardCategory === category.id ? "page" : undefined} className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${activeDashboardCategory === category.id ? "bg-violet-50 text-violet-800" : "text-slate-600 hover:bg-slate-50 hover:text-violet-800"}`}><Icon name={category.icon} className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{category.label}</span><span className="text-[10px] text-slate-400">{tests.filter((test) => category.terms.some((term) => cleanTestSearch(`${test.title} ${test.examSearchText}`).includes(cleanTestSearch(term)))).length}</span></button>)}
                </nav>
              </aside>

              <aside aria-label="Test series" className="hidden min-w-0 rounded-xl border border-slate-200 bg-white p-3 xl:block">
                <h3 className="mb-2 px-1 text-xs font-extrabold text-slate-800">Test Series</h3>
                <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                  {dashboardSeriesCounts.map((series) => <button key={series.id} type="button" onClick={() => chooseTestSeries(series.id)} aria-pressed={selectedDashboardSeries?.id === series.id} className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${selectedDashboardSeries?.id === series.id ? "border-violet-300 bg-violet-50 shadow-sm" : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50"}`}><span className="block text-[11px] font-bold leading-4 text-slate-800">{series.name}</span><span className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[9px] font-semibold text-slate-500"><span>{series.total} tests</span><span className="text-emerald-700">{series.free} free</span><span className="text-violet-700">{series.paid} paid</span></span></button>)}
                </div>
              </aside>

              <div id="category-test-list" className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-sm font-extrabold text-slate-900">{selectedDashboardSeries?.name || `${activeExamCategory.label} Tests`}</h3><p className="mt-1 text-[11px] text-slate-500">{selectedDashboardSeries?.total || 0} tests · {selectedDashboardSeries?.free || 0} free · {selectedDashboardSeries?.paid || 0} paid</p></div>
                  <label className="hidden min-w-[230px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 xl:flex"><Icon name="grid" className="h-4 w-4 text-violet-600" /><select value={selectedDashboardSeries?.id || ""} onChange={(event) => chooseTestSeries(event.target.value)} aria-label="Select test series" className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none">{dashboardSeries.map((series) => <option key={series.id} value={series.id}>{series.name}</option>)}</select></label>
                </div>
                <div role="tablist" aria-label="Test type" className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-3">
                  {[{ name: "Mock Tests", count: mockDashboardTests.length }, { name: "Previous Year Papers", count: previousYearDashboardTests.length }].map((item) => <button key={item.name} type="button" role="tab" aria-selected={dashboardTab === item.name} onClick={() => { setDashboardTab(item.name); setDashboardFilter("All"); }} className={`min-h-11 rounded-lg border px-2.5 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:text-sm ${dashboardTab === item.name ? "border-violet-200 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{item.name} <span className="ml-1 text-[10px] opacity-70">({item.count})</span></button>)}
                </div>
                <div role="group" aria-label="Filter tests" className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {["All", "Free", "Latest Tests", "Test Bucket", "Topper's Guidance Program"].map((filter) => <button key={filter} type="button" aria-pressed={dashboardFilter === filter} onClick={() => setDashboardFilter(filter)} className={`min-h-9 shrink-0 rounded-full border px-3 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:text-xs ${dashboardFilter === filter ? "border-violet-700 bg-violet-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800"}`}>{filter}</button>)}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2" aria-live="polite">
                  {loading ? <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading published tests…</p> : dashboardVisibleTests.length ? dashboardVisibleTests.slice(0, pageSize).map((test) => {
                    const startHref = test.href.includes("/mock-tests/free-practice") ? `${test.href}${test.href.includes("?") ? "&" : "?"}start=1` : test.href;
                    const unlockHref = test.courseId ? `/checkout?course=${encodeURIComponent(test.courseId)}` : "/courses";
                    const isLiveTest = test.source === "Verified online test";
                    return <article key={`${test.id}-${test.title}`} className="overflow-hidden rounded-[18px] border border-violet-200/80 bg-[linear-gradient(160deg,#5b45ec_0%,#7869eb_46%,#f4f1ff_100%)] p-3.5 text-white shadow-[0_10px_26px_rgba(75,55,190,.14)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(75,55,190,.2)] sm:p-4">
                      <div className="flex min-h-[68px] items-start gap-3 border-b border-white/45 pb-3">
                        <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm sm:h-14 sm:w-14"><Icon name="test" className="h-6 w-6" /></span>
                        <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h4 className="line-clamp-2 text-sm font-extrabold leading-5 text-white sm:text-base">{test.title}</h4><span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[9px] font-extrabold tracking-wide text-rose-600">{isLiveTest ? <><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />LIVE TEST</> : test.access === "Free" ? "FREE TEST" : test.access === "Premium" ? "PAID TEST" : "MOCK TEST"}</span></div><p className="mt-1 truncate text-[10px] font-semibold text-violet-950/75">{test.exam}{test.subject ? ` · ${test.subject}` : ""}</p></div>
                      </div>
                      <div className="flex items-center gap-2 border-b border-dashed border-violet-300/70 py-3 text-violet-950"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-violet-700"><Icon name="clock" className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10px] font-bold text-violet-900/75">Test Duration</p><p className="truncate text-xs font-extrabold">{test.duration || "—"}</p></div></div>
                      <div className="grid grid-cols-2 gap-2 py-3 text-violet-950"><div className="flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-violet-700"><Icon name="chart" className="h-4 w-4" /></span><div><p className="text-[10px] font-bold text-violet-900/75">Total Marks</p><p className="text-xs font-extrabold">{test.marks || "—"} Marks</p></div></div><div className="flex items-center gap-2 border-l border-violet-300/70 pl-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-violet-700"><Icon name="help" className="h-4 w-4" /></span><div><p className="text-[10px] font-bold text-violet-900/75">Total Questions</p><p className="text-xs font-extrabold">{test.questionCount || "—"} Ques</p></div></div></div>
                      {test.access === "Premium" ? <Link href={unlockHref} aria-label={`Unlock ${test.title}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-800 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Unlock Test <Icon name="arrow" className="h-4 w-4" /></Link> : <Link href={startHref} aria-label={`Attempt ${test.title} now`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-800 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Attempt Now <Icon name="arrow" className="h-4 w-4" /></Link>}
                    </article>;
                  }) : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center"><p className="text-sm font-bold text-slate-700">{dashboardFilter === "All" ? `No published ${dashboardTab.toLowerCase()} found for this series yet.` : `No ${dashboardFilter.toLowerCase()} match this series.`}</p><p className="mt-1 text-xs text-slate-500">New published tests for {activeExamCategory.label} will appear here.</p></div>}
                  {!loading && dashboardVisibleTests.length > pageSize ? <button type="button" onClick={() => setPageSize((size) => size + 10)} className="w-full rounded-lg border border-slate-200 py-2.5 text-xs font-bold text-violet-700 transition hover:bg-violet-50">Show more tests</button> : null}
                </div>
              </div>
            </div>
          </section> : null}

          <div className="tr-mobile-dashboard grid gap-4">
            <section className="grid gap-3 rounded-2xl border border-blue-500/35 bg-[radial-gradient(ellipse_at_12%_20%,rgba(16,102,234,.18),transparent_42%),linear-gradient(120deg,#031a43,#05245a_58%,#031633)] p-3 shadow-[0_24px_65px_rgba(0,0,0,.2)] sm:grid-cols-[minmax(0,1.2fr)_minmax(250px,.8fr)] sm:items-center sm:gap-5 sm:p-6"><div className="flex min-w-0 items-center gap-3 sm:gap-6"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-full p-[5px] sm:h-28 sm:w-28 sm:p-[6px]" style={{ background: `conic-gradient(#1687ff ${completionProgress}%,#0c3978 0)` }}><div className="grid h-full w-full place-items-center rounded-full bg-[#06204a] text-lg font-bold text-white sm:text-2xl">{historyLoading ? "…" : `${completionProgress}%`}</div></div><div className="hidden h-20 w-px shrink-0 bg-blue-400/25 sm:block" /><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-blue-200 sm:text-xs sm:tracking-[.15em]">Overall Progress</p><h2 className="mt-1 text-base font-bold text-white sm:mt-2 sm:text-2xl">Completed practice</h2><p className="mt-0.5 text-xl font-bold text-cyan-300 sm:mt-1.5 sm:text-2xl">{historyLoading ? "…" : history.length}<span className="ml-2 text-sm font-semibold text-white sm:text-base">attempts</span></p><p className="mt-0.5 text-[10px] leading-4 text-blue-200 sm:mt-1 sm:text-xs sm:leading-5">{loading ? "Loading available tests…" : `Out of ${tests.length} available tests`} · Keep practicing to improve your performance.</p></div></div><div className="flex min-h-0 items-center gap-3 rounded-xl border border-blue-400/25 bg-blue-900/25 p-3 sm:min-h-28 sm:gap-4 sm:p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/20 text-cyan-300 sm:h-12 sm:w-12"><svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8m-4-4v4M7 4H4v2a5 5 0 0 0 4.3 5M17 4h3v2a5 5 0 0 1-4.3 5M7 3h10v7a5 5 0 0 1-10 0z"/><path d="m12 5 1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L9 7.3 11 7z"/></svg></span><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-blue-200 sm:text-xs sm:tracking-[.15em]">Best saved score</p><p className="mt-1 text-xl font-bold text-white sm:mt-1.5 sm:text-2xl">{historyLoading ? "…" : best === null ? "—" : `${best}%`}</p><p className="mt-1 text-[10px] text-blue-200 sm:text-[11px]">Highest score across submitted tests</p></div></div></section>
          </div>

          <section aria-label="Choose a test format" className="tr-mobile-quick tr-mobile-dashboard-quick mt-5">
            <div className="mb-3 flex items-end justify-between gap-2">
              <div><p className="text-[9px] font-bold uppercase tracking-[.18em] text-sky-300">Quick access</p><h2 className="mt-1 text-base font-bold text-white">Choose your test</h2></div>
              <span className="pb-0.5 text-[10px] font-medium text-slate-400">Pick a format <span aria-hidden="true">→</span></span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              {[
                { title: "Live Mock", detail: `${tests.filter((item) => item.source === "Verified online test").length} timed tests`, label: "REAL-TIME PRACTICE", action: "Explore tests", icon: "live", tone: "border-blue-500/70 from-[#08245e] via-[#061942] to-[#020d2a] text-sky-300", iconTone: "bg-blue-400/15 text-blue-300", href: "/test-rank?mode=timed#choose-format" },
                { title: "AI Mock", detail: "Create a mock for your exam and topics", label: "PERSONALIZED AI", action: "Create mock", icon: "spark", tone: "border-cyan-400/60 from-[#063c50] via-[#042b3d] to-[#031a31] text-cyan-300", iconTone: "bg-cyan-400/15 text-cyan-300", href: "/test-rank?mode=topic#choose-format" },
                { title: "Premium Mock", detail: "Exam-length premium practice", label: "EXCLUSIVE SERIES", action: "View series", icon: "crown", tone: "border-amber-400/60 from-[#493313] via-[#292018] to-[#151522] text-amber-300", iconTone: "bg-amber-400/15 text-amber-300", href: "/test-rank?mode=full#choose-format" },
                { title: "PYQ Mock", detail: "Previous year question papers", label: "PAST EXAM PAPERS", action: "Practice PYQs", icon: "paper", tone: "border-violet-500/65 from-[#302078] via-[#21184e] to-[#110e31] text-fuchsia-300", iconTone: "bg-violet-400/15 text-violet-300", href: "/test-rank?tab=Previous%20Year%20Papers#choose-format" },
                { title: "Paid Mock", detail: `${tests.filter((item) => item.access === "Premium").length} paid tests · unlock test series`, label: "PREMIUM ACCESS", action: "View tests", icon: "payment", tone: "border-teal-400/60 from-[#063c50] via-[#062b3c] to-[#03182c] text-teal-300", iconTone: "bg-teal-400/15 text-teal-300", href: "/test-rank?tab=Premium%20Tests#choose-format" }
              ].map((item) => <Link key={item.title} href={item.href} aria-label={`${item.title}: ${item.detail}. ${item.action}`} className={`rank-format-card group relative isolate flex min-h-[190px] min-w-0 flex-col justify-between overflow-hidden rounded-[22px] border bg-gradient-to-br p-3 shadow-[0_14px_30px_rgba(0,0,0,.3)] ring-1 ring-white/[.04] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_42px_rgba(0,0,0,.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#030d1b] motion-reduce:transform-none motion-reduce:transition-none ${item.title === "Live Mock" ? "live-mock-card" : ""} ${item.tone}`}>
                <span aria-hidden="true" className="pointer-events-none absolute -right-7 -top-8 h-24 w-24 rounded-full bg-white/[.11] blur-2xl transition-opacity group-hover:opacity-90" />
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-70" />
                <span className="relative flex items-start justify-between gap-2"><span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/15 ${item.iconTone} shadow-[0_10px_28px_rgba(0,0,0,.2)]`}>{item.title === "Live Mock" ? <LiveTestArtwork idPrefix="unified" /> : <FormatIcon kind={item.title} />}</span><span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[.08] text-xl text-white transition group-hover:translate-x-0.5 group-hover:bg-white/[.16]">→</span></span>
                <span className="relative block min-w-0"><small className="block text-[9px] font-extrabold tracking-[.14em] text-white/65"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />{item.label}</small><b className="mt-2 block text-lg font-extrabold leading-tight tracking-tight text-white sm:text-xl">{item.title}</b><small className="mt-2 block min-h-10 text-xs leading-5 text-slate-200/85 sm:text-sm">{item.detail}</small><span className="mt-2.5 block border-t border-white/15 pt-2.5 text-xs font-extrabold sm:text-sm">{item.action}</span></span>
              </Link>)}
            </div>
          </section>

          <section className="tr-mobile-target tr-mobile-dashboard-target relative mt-3 overflow-hidden rounded-2xl border border-blue-300/20 bg-[linear-gradient(115deg,#102f85,#143caa_62%,#0b245f)] p-3 text-white shadow-[0_18px_45px_rgba(7,25,83,.28)] sm:mt-4 sm:p-5 md:hidden">
            <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-cyan-300/15 blur-2xl" />
            <div className="relative flex items-start gap-2.5 sm:gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/20 bg-white/10 text-amber-200 sm:h-11 sm:w-11 sm:rounded-xl"><Icon name="school" className="h-5 w-5 sm:h-6 sm:w-6" /></span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-blue-200 sm:text-[10px] sm:tracking-[.18em]">Your preparation plan</p><h2 className="mt-0.5 text-base font-bold sm:mt-1 sm:text-lg">Build a stronger daily routine</h2><p className="mt-1 text-[11px] leading-4 text-blue-100/80 sm:text-xs sm:leading-5">Practice topic-wise, follow current affairs and keep your exam goals on track.</p></div></div>
            <div className="relative mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2"><Link href="/mock-tests" className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/15 sm:px-3 sm:py-2 sm:text-xs">Daily Quiz</Link><Link href="/current-affairs" className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/15 sm:px-3 sm:py-2 sm:text-xs">Current Affairs</Link><Link href="/courses" className="ml-auto rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-blue-950 transition hover:bg-blue-50 sm:px-3.5 sm:py-2 sm:text-xs">Explore courses →</Link></div>
          </section>
          <section id="mock-tests" aria-label="Mock tests" className="tr-mobile-series tr-mobile-dashboard-series mt-7 scroll-mt-24 overflow-hidden rounded-2xl border border-white/[.08] bg-[linear-gradient(110deg,rgba(9,24,47,.94),rgba(5,14,29,.92))] p-3 shadow-[0_22px_55px_rgba(0,0,0,.24)] sm:p-4 md:scroll-mt-28">
            <div id="choose-format" className="mb-3 flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div><p className="text-[9px] font-extrabold uppercase tracking-[.22em] text-cyan-300">Choose your format</p><h2 className="mt-1 text-lg font-bold tracking-tight text-white sm:text-xl">Start Your Free Mock Test</h2><p className="mt-1 text-[11px] text-slate-400 sm:text-xs">Choose your exam and start practicing today.</p></div>
              <label className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-white/10 bg-[#07172e] px-3 text-slate-400 sm:max-w-[280px]"><Icon name="search" className="h-4 w-4 shrink-0 text-cyan-300" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search mock tests" aria-label="Search mock tests" className="min-w-0 flex-1 bg-transparent py-2 text-xs text-white outline-none placeholder:text-slate-500" /></label>
            </div>
            <div className="grid grid-cols-3 gap-2.5 pb-2 md:flex md:snap-x md:snap-mandatory md:gap-3 md:overflow-x-auto md:pb-2 md:[scrollbar-color:rgba(125,211,252,.28)_transparent] md:[scrollbar-width:thin]">
              {practiceFormats.map((item) => {
                const isSelected = selectedFormat === item.id;
                const formatTests = isSelected ? filteredTests : [];
                const toneBorder = item.tone === "blue" ? "border-blue-300/55" : item.tone === "emerald" ? "border-emerald-300/55" : item.tone === "violet" ? "border-violet-300/55" : item.tone === "amber" ? "border-amber-300/55" : item.tone === "cyan" ? "border-cyan-300/55" : "border-rose-300/55";
                const toneBackground = item.tone === "blue" ? "bg-[linear-gradient(145deg,rgba(12,43,82,.98),rgba(8,21,42,.98))]" : item.tone === "emerald" ? "bg-[linear-gradient(145deg,rgba(8,55,47,.98),rgba(8,26,32,.98))]" : item.tone === "violet" ? "bg-[linear-gradient(145deg,rgba(43,31,83,.98),rgba(22,21,48,.98))]" : item.tone === "amber" ? "bg-[linear-gradient(145deg,rgba(66,48,20,.98),rgba(31,27,25,.98))]" : item.tone === "cyan" ? "bg-[linear-gradient(145deg,rgba(10,52,70,.98),rgba(8,26,39,.98))]" : "bg-[linear-gradient(145deg,rgba(67,28,52,.98),rgba(30,22,39,.98))]";
                const toneAccent = item.tone === "blue" ? "text-sky-300" : item.tone === "emerald" ? "text-emerald-300" : item.tone === "violet" ? "text-violet-300" : item.tone === "amber" ? "text-amber-300" : item.tone === "cyan" ? "text-cyan-300" : "text-rose-300";
                const toneGlow = item.tone === "blue" ? "shadow-[0_0_18px_rgba(14,165,233,.18)] hover:shadow-[0_0_28px_rgba(14,165,233,.34)]" : item.tone === "emerald" ? "shadow-[0_0_18px_rgba(16,185,129,.18)] hover:shadow-[0_0_28px_rgba(16,185,129,.34)]" : item.tone === "violet" ? "shadow-[0_0_18px_rgba(168,85,247,.2)] hover:shadow-[0_0_28px_rgba(168,85,247,.36)]" : item.tone === "amber" ? "shadow-[0_0_18px_rgba(251,191,36,.18)] hover:shadow-[0_0_28px_rgba(251,191,36,.34)]" : item.tone === "cyan" ? "shadow-[0_0_18px_rgba(34,211,238,.18)] hover:shadow-[0_0_28px_rgba(34,211,238,.34)]" : "shadow-[0_0_18px_rgba(244,63,94,.18)] hover:shadow-[0_0_28px_rgba(244,63,94,.34)]";
                const toneAction = item.tone === "blue" ? "from-blue-600/90 to-blue-950/80 border-blue-300/60 text-blue-50" : item.tone === "emerald" ? "from-emerald-600/90 to-emerald-950/80 border-emerald-300/60 text-emerald-50" : item.tone === "violet" ? "from-violet-600/90 to-violet-950/80 border-violet-300/60 text-violet-50" : item.tone === "amber" ? "from-amber-500/90 to-amber-950/80 border-amber-200/60 text-amber-50" : item.tone === "cyan" ? "from-cyan-600/90 to-cyan-950/80 border-cyan-300/60 text-cyan-50" : "from-rose-600/90 to-rose-950/80 border-rose-300/60 text-rose-50";
                const titleWords = item.title.split(" ");
                const titleAccent = titleWords.pop();
                const titleLead = titleWords.join(" ");
                return <article key={item.id} className={`group relative ${isSelected ? "col-span-3 w-full md:col-span-1 md:w-[min(340px,85vw)]" : "w-full min-w-0 md:w-[238px] md:min-w-[238px]"} min-h-[136px] overflow-hidden rounded-2xl border p-2.5 text-left ring-1 ring-inset ring-white/[.08] transition-[width,border-color,box-shadow,transform] duration-300 sm:min-h-[176px] sm:p-4 md:shrink-0 md:snap-start ${toneBorder} ${toneBackground} ${toneGlow} ${isSelected ? "border-opacity-90 shadow-[0_0_30px_rgba(56,189,248,.28)]" : "hover:-translate-y-0.5"}`}>
                <span aria-hidden="true" className={`pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full opacity-35 blur-3xl transition duration-300 group-hover:opacity-60 ${item.tone === "blue" ? "bg-sky-300" : item.tone === "emerald" ? "bg-emerald-300" : item.tone === "violet" ? "bg-violet-300" : item.tone === "amber" ? "bg-amber-200" : item.tone === "cyan" ? "bg-cyan-300" : "bg-rose-300"}`} />
                <button type="button" onClick={() => selectFormat(item.id)} aria-expanded={isSelected} className="relative flex min-h-[116px] w-full flex-col justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 sm:min-h-[144px]">
                  <span className="relative flex items-start justify-between gap-1 sm:gap-2"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/[.09] shadow-[0_0_24px_rgba(255,255,255,.08)] sm:h-11 sm:w-11 sm:rounded-xl ${item.tone === "blue" ? "text-sky-200" : item.tone === "emerald" ? "text-emerald-200" : item.tone === "violet" ? "text-violet-200" : item.tone === "amber" ? "text-amber-200" : item.tone === "cyan" ? "text-cyan-200" : "text-rose-200"}`}><Icon name={item.icon} className="h-4 w-4 sm:h-5 sm:w-5" /></span><span className={`max-w-[60%] truncate rounded-full border border-white/10 bg-black/20 px-1.5 py-1 text-[7px] font-extrabold tracking-normal sm:max-w-none sm:px-2 sm:text-[8px] sm:tracking-[.12em] ${item.tone === "blue" ? "text-sky-200" : item.tone === "emerald" ? "text-emerald-200" : item.tone === "violet" ? "text-violet-200" : item.tone === "amber" ? "text-amber-200" : item.tone === "cyan" ? "text-cyan-200" : "text-rose-200"}`}>{item.badge}</span></span>
                  <span className="relative"><b className="block text-xs font-extrabold leading-tight tracking-tight text-white sm:text-sm">{titleLead ? <>{titleLead} </> : null}<span className={toneAccent}>{titleAccent}</span></b><small className="mt-1 hidden text-[9px] leading-[1.35] text-slate-300 sm:mt-1.5 sm:block sm:text-[11px] sm:leading-[1.45]">{item.detail}</small><span className={`mt-2 flex items-center justify-between rounded-full border bg-gradient-to-r px-2 py-1 text-[9px] font-extrabold shadow-inner sm:mt-3 sm:px-3 sm:py-1.5 sm:text-[10px] ${toneAction}`}><span>{isSelected ? "Close tests" : "Explore"}</span><span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full border border-white/25 bg-black/20 text-sm transition group-hover:translate-x-0.5 sm:h-6 sm:w-6">{isSelected ? "−" : "→"}</span></span></span>
                </button>
                {isSelected ? <div className="relative mt-3 border-t border-white/15 pt-3" aria-live="polite"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-[9px] font-extrabold uppercase tracking-[.15em] text-white/75">{loading ? "Loading tests" : `${filteredTests.length} tests`}</p><span className="text-[9px] text-white/55">Tap a test to start</span></div>{loading ? <div className="space-y-2">{[1, 2, 3].map((index) => <div key={index} className="h-10 animate-pulse rounded-lg bg-black/20" />)}</div> : formatTests.length ? <div className="max-h-64 space-y-2 overflow-y-auto pr-1">{formatTests.slice(0, pageSize).map((test) => <Link key={test.id} href={test.href.includes("/mock-tests/free-practice") ? `${test.href}${test.href.includes("?") ? "&" : "?"}start=1` : test.href} className="block rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 transition hover:border-white/25 hover:bg-white/[.08]"><span className="block truncate text-[11px] font-bold text-white">{test.title}</span><span className="mt-1 flex items-center justify-between gap-2 text-[9px] text-white/65"><span className="truncate">{test.exam}</span><span className="shrink-0">{test.questionCount || "—"} Q · {test.duration}</span></span><span className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-[9px] font-extrabold text-cyan-200"><span>Start Test</span><span aria-hidden="true">→</span></span></Link>)}</div> : <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-[11px] leading-5 text-white/70">{error || `No ${item.title.toLowerCase()} are published yet.`}</p>}{!loading && formatTests.length > pageSize ? <button type="button" onClick={() => setPageSize((size) => size + 5)} className="mt-2 w-full rounded-lg border border-white/15 px-3 py-2 text-[10px] font-bold text-white/80 transition hover:bg-white/[.08]">Show more tests</button> : null}</div> : null}
              </article>;
              })}
            </div>
          </section>
          <aside className="tr-mobile-performance mt-4 grid content-start gap-4 md:grid-cols-2 2xl:grid-cols-3"><section className="rounded-xl border border-sky-400/20 bg-[#041326] p-4"><div className="flex items-center justify-between"><h2 className="font-bold text-white">Upcoming Tests</h2><a href="#choose-format" className="text-xs text-sky-300">View all →</a></div><div className="mt-3 rounded-lg border border-white/10 bg-white/[.025] p-4 text-center"><p className="text-sm font-medium text-slate-200">No scheduled tests available</p><p className="mt-1 text-xs text-slate-500">Choose a format above to browse published practice sets.</p></div></section><section id="my-performance" className="rounded-xl border border-sky-400/20 bg-[#041326] p-4"><div className="flex items-center justify-between"><h2 className="font-bold text-white">Performance Overview</h2><span className="text-[10px] text-slate-500">Verified submissions</span></div>{history.length ? <><div className="mt-5 flex h-32 items-end gap-2 border-b border-l border-white/10 px-2">{history.slice(-8).map((item, index) => <div key={item.id || index} className="flex-1 rounded-t bg-gradient-to-t from-blue-700 to-cyan-400" style={{ height: `${Math.max(8, Math.min(100, Number(item.percent) || 0))}%` }} title={`${item.percent}% accuracy`} />)}</div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><SmallStat label="Attempts" value={history.length} /><SmallStat label="Average accuracy" value={`${average}%`} /><SmallStat label="Best score" value={`${best}%`} /><SmallStat label="Avg seconds / question" value={`${averageTimePerQuestion ?? "—"}s`} /></div></> : <div className="mt-4 rounded-lg border border-dashed border-white/10 p-5 text-center"><p className="text-sm text-slate-300">Your verified performance appears here</p><p className="mt-1 text-xs text-slate-500">Complete a published online test while logged in.</p></div>}</section><section className="rounded-xl border border-amber-300/20 bg-[linear-gradient(115deg,#211a0a,#11192b_65%,#0b2343)] p-5"><p className="text-xs font-bold uppercase tracking-wide text-amber-300">♛ Badam Classes</p><h2 className="mt-2 text-xl font-bold text-white">Build your exam plan</h2><p className="mt-2 text-xs leading-5 text-slate-300">Explore structured lessons, practice materials and live classes.</p><Link href="/courses" className="mt-4 inline-flex rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950">Explore Courses →</Link></section></aside>

          <footer className="mt-8 border-t border-white/10 py-5 text-center text-xs text-slate-500">BADAM TESTRANK — Powered by Badam Classes</footer>
        </main>
      </div>
      <nav aria-label="Mobile navigation" className="tr-mobile-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-sky-400/20 bg-[#020b18]/95 px-2 py-2 backdrop-blur md:hidden">{[{ label: "Home", href: "https://www.badamclasses.in", icon: "home" }, { label: "Tests", href: "/test-rank#choose-format", icon: "test" }, { label: "Practice", href: "/mock-tests", icon: "quiz" }, { label: "Purchases", href: "/dashboard", icon: "payment" }, { label: "Profile", href: "/profile", icon: "user" }].map((item) => <Link key={item.label} href={item.href} aria-current={item.label === "Tests" ? "page" : undefined} className={`grid min-h-12 content-center justify-items-center gap-1 text-[10px] font-semibold ${item.label === "Tests" ? "text-sky-300" : "text-slate-400"}`}><Icon name={item.icon} className="h-[18px] w-[18px]" />{item.label}</Link>)}</nav>
    </div>
  );
}

function TestMetaSmall({ label, value }) { return <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 truncate text-[11px] font-bold text-slate-800">{value || "—"}</p></div>; }
function FilterSelect({ label, value, onChange, options }) {
  return <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#07172e] px-3 py-2 text-[10px] text-slate-400">{label}<select value={value} onChange={(event) => onChange(event.target.value)} aria-label={`Filter by ${label}`} className="min-w-0 bg-transparent text-xs font-medium text-slate-100 outline-none">{options.map((option) => <option className="bg-[#07172e]" key={option}>{option}</option>)}</select></label>;
}
function Detail({ icon, label, value }) { return <div className="min-w-0 rounded-lg bg-white/[.04] p-2.5"><p className="flex min-w-0 items-center gap-1.5 text-[9px] uppercase tracking-wide text-slate-500"><Icon name={icon} className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{label}</span></p><p className="mt-1 break-words font-semibold text-slate-200">{value}</p></div>; }
function SmallStat({ label, value }) { return <div className="rounded-lg border border-white/10 bg-white/[.03] p-2"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></div>; }
