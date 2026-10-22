"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InstructorPage from "@/app/instructor/page";
import styles from "@/app/admin/admin.module.css";
import { batches } from "@/lib/fixtures";
import { logout } from "@/lib/auth";
import { buildDefaultAdminWorkspace, readAdminWorkspace, writeAdminWorkspace } from "@/lib/adminWorkspace";
import { filterDeletedCourses, readLocalCourses } from "@/lib/localCourseState";
import LiveChatInbox from "@/components/admin/LiveChatInbox";
import LocalCourseManager from "@/components/admin/LocalCourseManager";
import {
  AIInsightsPanel,
  AnnouncementTickerEditor,
  EnquiryPopupEditor,
  AutomationOpsPanel,
  CouponManager,
  DashboardAnalytics,
  MediaLibrary,
  NotificationCenter,
  OnlineMockTestManager,
  OrdersAndPayments,
  SscAnswerKeyAutomationPanel,
  SubjectCourseManager,
  SuccessStoriesManager,
  UserManagement,
  WebsiteMaintenanceAssistant,
  WebsiteSettings
} from "@/components/admin/AdminWorkspaceModules";

const PDF_STORAGE_KEY = "badamclasses_local_pdfs";
const CHAT_STORAGE_KEY = "bsc_chat_log";
const NOTICE_STORAGE_KEY = "badamclasses_site_notice";

const moduleSections = [
  {
    id: "dashboard",
    title: "Dashboard",
    kicker: "Overview",
    description: "Live summary of batches, students, support, and operational health.",
    points: [
      "Total students, paid and unpaid students",
      "Total courses, active batches, and pending inquiries",
      "Live classes status and support ticket snapshot"
    ]
  },
  {
    id: "students",
    title: "Student Management",
    kicker: "Students",
    description: "Student records, payment history, login status, attendance, and support visibility.",
    points: [
      "Add or edit student profile, phone, email, and assigned batch",
      "Track payment history, attendance, and test performance",
      "Review login status, blocked access, and follow-up flags"
    ]
  },
  {
    id: "courses",
    title: "Courses & Batch Management",
    kicker: "Courses",
    description: "Manage every batch with pricing, timings, class sections, thumbnails, and curriculum.",
    points: [
      "Add batch timing and class timing",
      "Create Advance, Arithmetic, Reasoning, or custom sections",
      "Update pricing, description, and curriculum"
    ],
    embeddedTab: "Courses"
  },
  {
    id: "live",
    title: "Video / Live Class Management",
    kicker: "Live",
    description: "Control slider order, auto-live schedule, recorded links, and homepage visibility.",
    points: [
      "Reorder homepage batches and hide or pin them",
      "Manage live now, stop live, and auto-live windows",
      "Edit batch schedule directly from the schedule table"
    ],
    embeddedTab: "Live Controls"
  },
  {
    id: "mock-tests",
    title: "Mock Test System",
    kicker: "Tests",
    description: "Online mock test management with links, uploaded files, status, and student-facing visibility.",
    points: [
      "Upload or link online mock tests from admin panel",
      "Publish or draft tests for student-facing Mock Tests page",
      "Keep questions, duration, difficulty, and exam labels updated"
    ]
  },
  {
    id: "ssc-answer-keys",
    title: "SSC Official Answer Keys",
    kicker: "SSC Keys",
    description: "Monitor official SSC notices, review extracted public answer-key records, and audit revisions before publishing.",
    points: [
      "Check official SSC notices every six hours and run a manual dry-run",
      "Review public PDF links, extraction previews, unavailable files, and failures",
      "Enable audited answer-only publishing after a successful dry-run"
    ]
  },
  {
    id: "payments",
    title: "Payment & Invoice",
    kicker: "Payments",
    description: "Track checkout status, payment outcomes, coupon logic, and receipts.",
    points: [
      "Paid, pending, failed, and refunded payment visibility",
      "Coupon code flow and transaction search",
      "Invoice-ready payment records"
    ]
  },
  {
    id: "pdfs",
    title: "PDF / Study Material",
    kicker: "Materials",
    description: "Study material controls with visibility, watermark, and protection planning.",
    points: [
      "Course-wise notes management and access control",
      "Download enable or disable planning",
      "Watermark and protected notes workflow"
    ]
  },
  {
    id: "notifications",
    title: "Notifications & Homepage",
    kicker: "Alerts",
    description: "Manage homepage notices, offer banner, and site-wide updates.",
    points: [
      "Offer banner title, text, image, and link",
      "Homepage announcement message",
      "Student-facing notice controls",
      "Mobile enquiry popup show or hide"
    ],
    embeddedTab: "Offer & Notice"
  },
  {
    id: "teachers",
    title: "Teacher Panel",
    kicker: "Faculty",
    description: "Teacher login, report uploads, attendance updates, and batch-level tracking.",
    points: [
      "Assign batches and view teacher responsibilities",
      "Attendance and class report workflows",
      "Teacher-specific recordings and question creation planning"
    ]
  },
  {
    id: "crm",
    title: "Enquiry & CRM",
    kicker: "CRM",
    description: "Track leads, source channels, reminders, and admission pipeline movement.",
    points: [
      "Website inquiry list and lead status",
      "Source attribution from WhatsApp, Facebook, Instagram, and referral",
      "Follow-up reminders and admissions pipeline"
    ]
  },
  {
    id: "content",
    title: "Content Management",
    kicker: "Content",
    description: "Homepage, toppers, faculty details, testimonials, and current affairs posts.",
    points: [
      "Homepage banner and section controls",
      "Faculty details and toppers update planning",
      "Testimonials and blog or current affairs content"
    ]
  },
  {
    id: "security",
    title: "Security Advanced",
    kicker: "Security",
    description: "Role-based access, device checks, active logs, and anti-sharing controls.",
    points: [
      "Admin, teacher, and staff role layers",
      "Device and IP awareness",
      "Limit multi-device login and course sharing"
    ]
  },
  {
    id: "reports",
    title: "Reports",
    kicker: "Reports",
    description: "Business and learning analytics across sales, batches, tests, and attendance.",
    points: [
      "Sales report and course-wise revenue",
      "Student growth and unpaid student report",
      "Attendance and test performance reporting"
    ]
  },
  {
    id: "ai",
    title: "Advanced AI Features",
    kicker: "AI",
    description: "AI modules for doubt solving, test analysis, question generation, and weak-topic insights.",
    points: [
      "AI mock test analysis and student performance signals",
      "Question generator and doubt assistant",
      "Weak-topic detection and motivation automation"
    ]
  },
  {
    id: "support",
    title: "Live Support Inbox",
    kicker: "Support",
    description: "Admin messaging, student reply management, and inbox cleanup from one panel.",
    points: [
      "View incoming student chat",
      "Send admin replies",
      "Clear resolved support threads"
    ],
    embeddedTab: "Live Chat"
  }
];

function readJsonStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function formatValue(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function ModuleChip({ module, active = false, onClick }) {
  return (
    <a
      href={`#${module.id}`}
      onClick={onClick}
      aria-current={active ? "location" : undefined}
      className={`admin-nav-link flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${active ? "is-active" : ""}`}
    >
      <span className="admin-nav-icon grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-bold uppercase">{module.kicker.slice(0, 2)}</span>
      <span className="min-w-0 flex-1 truncate">{module.title}</span>
      <span className="text-xs opacity-70" aria-hidden="true">›</span>
    </a>
  );
}

function SectionShell({ module, children, badge = "Visible in admin panel" }) {
  return (
    <section id={module.id} className="admin-section scroll-mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600">{module.kicker}</p>
          <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-slate-900">{module.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{module.description}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>{badge}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {module.points.map((point) => (
          <div key={point} className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm leading-5 text-slate-600">
            {point}
          </div>
        ))}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}

function PlaceholderWorkspace({ title, description, cards }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-display text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {cards.map((card) => (
        <div key={card.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{card.title}</p>
          <p className="mt-3 text-sm leading-6 text-slate-700">{card.text}</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminPanel({ user, warning = "" }) {
  const [localData, setLocalData] = useState({
    localCourses: [],
    localPdfs: {},
    chatLog: [],
    notice: null
  });
  const [workspace, setWorkspace] = useState(buildDefaultAdminWorkspace);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [moduleQuery, setModuleQuery] = useState("");
  const [activeModule, setActiveModule] = useState("dashboard");

  const visibleModules = useMemo(() => {
    const query = moduleQuery.trim().toLowerCase();
    return query
      ? moduleSections.filter((module) => `${module.title} ${module.kicker} ${module.description}`.toLowerCase().includes(query))
      : moduleSections;
  }, [moduleQuery]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    setLocalData({
      localCourses: readLocalCourses(),
      localPdfs: readJsonStorage(PDF_STORAGE_KEY, {}),
      chatLog: readJsonStorage(CHAT_STORAGE_KEY, []),
      notice: readJsonStorage(NOTICE_STORAGE_KEY, null)
    });
    setWorkspace(readAdminWorkspace());
  }, []);

  useEffect(() => {
    writeAdminWorkspace(workspace);
  }, [workspace]);

  const applyAssistantSuggestions = (suggestions = {}) => {
    const nextSettings = suggestions.settings || {};
    const nextNotice = suggestions.notice || {};
    const appliedFields = [];

    setWorkspace((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...(nextSettings.bannerTitle ? (appliedFields.push("bannerTitle"), { bannerTitle: nextSettings.bannerTitle }) : {}),
        ...(nextSettings.seoTitle ? (appliedFields.push("seoTitle"), { seoTitle: nextSettings.seoTitle }) : {}),
        ...(nextSettings.seoDescription ? (appliedFields.push("seoDescription"), { seoDescription: nextSettings.seoDescription }) : {}),
        ...(nextSettings.supportEmail ? (appliedFields.push("supportEmail"), { supportEmail: nextSettings.supportEmail }) : {})
      },
      automation: {
        ...(current.automation || {}),
        lastAppliedAt: appliedFields.length || nextNotice.title || nextNotice.message ? new Date().toISOString() : current.automation?.lastAppliedAt || "",
        lastAppliedFields: [
          ...appliedFields,
          ...(nextNotice.title ? ["noticeTitle"] : []),
          ...(nextNotice.message ? ["noticeMessage"] : [])
        ]
      }
    }));

    if (nextNotice.title || nextNotice.message) {
      appliedFields.push(...(nextNotice.title ? ["noticeTitle"] : []), ...(nextNotice.message ? ["noticeMessage"] : []));
      const mergedNotice = {
        title: nextNotice.title || localData.notice?.title || "",
        message: nextNotice.message || localData.notice?.message || ""
      };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify(mergedNotice));
      }
      setLocalData((current) => ({
        ...current,
        notice: mergedNotice
      }));
    }

    return {
      applied: appliedFields.length > 0,
      fields: appliedFields
    };
  };

  const setAiAutoApply = (enabled) => {
    setWorkspace((current) => ({
      ...current,
      automation: {
        ...(current.automation || {}),
        aiAutoApply: Boolean(enabled)
      }
    }));
  };

  const mergedBatches = useMemo(() => {
    const fixtureCourses = filterDeletedCourses(batches).map((batch) => ({
      id: batch.id,
      title: batch.title,
      category: batch.category || "General",
      batchTime: batch.batchTime || "",
      startDate: batch.startDate || "",
      liveClassEnabled: Boolean(batch.liveClassEnabled),
      liveClassUrl: batch.liveClassUrl || "",
      liveClassTitle: batch.liveClassTitle || "",
      liveStreamType: batch.liveStreamType || "youtube",
      classSections: Array.isArray(batch.classSections) ? batch.classSections : [],
      pdfResources: []
    }));
    const combined = [...localData.localCourses, ...fixtureCourses];
    const seen = new Set();
    return combined.filter((item) => {
      const key =
        String(item._id || item.id || "").trim().toLowerCase() ||
        String(item.title || "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [localData.localCourses]);

  const metrics = useMemo(() => {
    const sectionCount = mergedBatches.reduce(
      (sum, item) => sum + (Array.isArray(item.classSections) ? item.classSections.length : 0),
      0
    );
    const pdfCount =
      Object.values(localData.localPdfs || {}).reduce((sum, item) => sum + (Array.isArray(item) ? item.length : 0), 0) +
      mergedBatches.reduce((sum, item) => sum + (Array.isArray(item.pdfResources) ? item.pdfResources.length : 0), 0);
    const activeBatchCount = mergedBatches.filter((item) => item.batchTime || item.liveClassUrl).length;
    const supportCount = localData.chatLog.filter((item) => item?.role === "user").length;

    return {
      totalBatches: mergedBatches.length,
      activeBatchCount,
      sectionCount,
      pdfCount,
      supportCount,
      noticeEnabled: Boolean(localData.notice?.title || localData.notice?.message),
      totalUsers: workspace.users.length,
      totalOrders: workspace.orders.length,
      totalRevenue: workspace.orders.reduce((sum, order) => sum + Number(order.amount || 0), 0)
    };
  }, [localData.chatLog, localData.localPdfs, localData.notice, mergedBatches, workspace]);

  return (
    <main className={`${styles.workspace} min-h-screen bg-slate-50 text-slate-900`}>
      <div className="mx-auto flex min-h-screen max-w-[1680px] gap-5 px-3 py-3 sm:px-5 lg:gap-6 lg:px-7">
        {mobileNavOpen ? (
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-[60] bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
          />
        ) : null}

        <aside id="admin-sidebar" className={`admin-sidebar z-[70] flex w-[min(84vw,280px)] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-[250px] lg:translate-x-0 lg:p-4 ${mobileNavOpen ? "fixed inset-y-0 left-0 rounded-l-none rounded-r-2xl" : "hidden lg:flex"}`}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-2 pb-4 pt-1">
            <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white">B</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-900">Badam Classes</span>
                <span className="block text-[11px] text-slate-500">Admin workspace</span>
              </span>
            </Link>
            <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-lg text-slate-600 hover:bg-slate-50 lg:hidden">×</button>
          </div>

          <label className="mt-4 block px-1">
            <span className="sr-only">Search admin modules</span>
            <span className="relative block">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>
              <input value={moduleQuery} onChange={(event) => setModuleQuery(event.target.value)} type="search" placeholder="Search modules" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" />
            </span>
          </label>

          <div className="mt-5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Workspace</div>
          <nav aria-label="Admin modules" className="mt-2 flex-1 space-y-1 overflow-y-auto px-1 pb-3">
            {visibleModules.length ? visibleModules.map((module) => (
              <ModuleChip
                key={module.id}
                module={module}
                active={activeModule === module.id}
                onClick={() => {
                  setActiveModule(module.id);
                  setMobileNavOpen(false);
                }}
              />
            )) : <p className="px-3 py-5 text-sm text-slate-500">No modules match “{moduleQuery}”.</p>}
          </nav>

          <div className="border-t border-slate-100 px-2 pt-3">
            <Link href="/" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <span aria-hidden="true">↗</span> View website
            </Link>
            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-500">Admin access is restricted to authorized accounts.</div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="admin-topbar sticky top-3 z-40 flex min-h-14 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 shadow-sm backdrop-blur sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileNavOpen(true)} aria-expanded={mobileNavOpen} aria-controls="admin-sidebar" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden">
                <span className="sr-only">Open admin navigation</span>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-slate-500">Badam Classes <span aria-hidden="true">/</span> Admin</p>
                <p className="truncate text-sm font-semibold text-slate-900">Overview</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-[180px] truncate text-xs font-semibold text-slate-800">{user?.name || user?.email || "Admin User"}</p>
                <p className="text-[10px] text-slate-500">Administrator</p>
              </div>
              <button type="button" onClick={() => { logout(); if (typeof window !== "undefined") window.location.href = "/login"; }} className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Logout</button>
            </div>
          </header>

          <div className="admin-content mt-5 space-y-5">
            {warning ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{warning}</div> : null}

            <section id="dashboard" className="scroll-mt-24">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600">Workspace</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Overview</h1>
                  <p className="mt-1 text-sm text-slate-500">A real-time snapshot of your courses, users, orders, and operations.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true"/>Workspace ready</span>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                  { label: "Total batches", value: formatValue(metrics.totalBatches), detail: `${formatValue(metrics.activeBatchCount)} active` },
                  { label: "Students & users", value: formatValue(metrics.totalUsers), detail: "Workspace records" },
                  { label: "Orders", value: formatValue(metrics.totalOrders), detail: "All recorded orders" },
                  { label: "Revenue", value: `₹${formatValue(metrics.totalRevenue)}`, detail: "Recorded order value" }
                ].map((item) => (
                  <article key={item.label} className="admin-kpi rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <p className="text-xs font-medium text-slate-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">{item.value}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                  </article>
                ))}
              </div>

              <div className="admin-ops-strip mt-3 grid grid-cols-2 gap-x-5 gap-y-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:grid-cols-3 xl:grid-cols-5">
                {[
                  { label: "Class sections", value: formatValue(metrics.sectionCount) },
                  { label: "PDF assets", value: formatValue(metrics.pdfCount) },
                  { label: "Support messages", value: formatValue(metrics.supportCount) },
                  { label: "Homepage notice", value: metrics.noticeEnabled ? "Enabled" : "Off" },
                  { label: "Live-ready batches", value: formatValue(metrics.activeBatchCount) }
                ].map((item) => <div key={item.label} className="min-w-0"><p className="truncate text-[11px] text-slate-500">{item.label}</p><p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{item.value}</p></div>)}
              </div>
            </section>

            <SectionShell key="dashboard" module={moduleSections[0]} badge="Overview">
              <div className="space-y-5">
                <DashboardAnalytics workspace={workspace} />
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                    <p className="text-sm font-semibold text-slate-800">Today snapshot</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {[
                        `Total managed batches: ${formatValue(metrics.totalBatches)}`,
                        `Live-ready batches: ${formatValue(metrics.activeBatchCount)}`,
                        `Configured class sections: ${formatValue(metrics.sectionCount)}`,
                        `Support requests in chat: ${formatValue(metrics.supportCount)}`
                      ].map((item) => <div key={item} className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">{item}</div>)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                    <p className="text-sm font-semibold text-slate-800">Quick focus</p>
                    <div className="mt-3 grid gap-2">
                      {[
                        "Courses section lets you add batch timing, class timing, and class sections.",
                        "Live controls section manages order, live status, and batch schedule.",
                        "Notifications section controls notice and offer banner.",
                        "Support section keeps student chat visible in admin."
                      ].map((item) => <div key={item} className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm leading-5 text-slate-700">{item}</div>)}
                    </div>
                  </div>
                </div>
              </div>
            </SectionShell>

            <div className="space-y-5">
              {moduleSections.filter((module) => module.id !== "dashboard").map((module) => {

          if (module.id === "students") {
            return (
              <SectionShell key={module.id} module={module} badge="CRUD active">
                <UserManagement workspace={workspace} setWorkspace={setWorkspace} />
              </SectionShell>
            );
          }

          if (module.embeddedTab === "Courses") {
            return (
              <SectionShell key={module.id} module={module} badge="Batch tools active">
                <div className="space-y-5">
                  <LocalCourseManager
                    publicCourses={mergedBatches}
                    onCoursesChange={(localCourses) =>
                      setLocalData((current) => ({
                        ...current,
                        localCourses
                      }))
                    }
                  />
                  <SubjectCourseManager workspace={workspace} setWorkspace={setWorkspace} batches={mergedBatches} />
                </div>
              </SectionShell>
            );
          }

          if (module.id === "payments") {
            return (
              <SectionShell key={module.id} module={module} badge="Tracking active">
                <div className="space-y-5">
                  <OrdersAndPayments workspace={workspace} setWorkspace={setWorkspace} />
                  <CouponManager workspace={workspace} setWorkspace={setWorkspace} />
                </div>
              </SectionShell>
            );
          }

          if (module.id === "mock-tests") {
            return (
              <SectionShell key={module.id} module={module} badge="Online mock upload active">
                <OnlineMockTestManager workspace={workspace} setWorkspace={setWorkspace} />
              </SectionShell>
            );
          }

          if (module.id === "ssc-answer-keys") {
            return (
              <SectionShell key={module.id} module={module} badge="Official SSC source monitor">
                <SscAnswerKeyAutomationPanel />
              </SectionShell>
            );
          }

          if (module.id === "ai") {
            return (
              <SectionShell key={module.id} module={module} badge="AI tools active">
                <div className="space-y-5">
                  <AutomationOpsPanel />
                  <WebsiteMaintenanceAssistant
                    workspace={workspace}
                    metrics={metrics}
                    notice={localData.notice}
                    automation={workspace.automation || {}}
                    onApplySuggestions={applyAssistantSuggestions}
                    onToggleAutoApply={setAiAutoApply}
                  />
                  <AIInsightsPanel workspace={workspace} mergedBatches={mergedBatches} />
                </div>
              </SectionShell>
            );
          }

          if (module.id === "pdfs") {
            return (
              <SectionShell key={module.id} module={module} badge="Media controls active">
                <MediaLibrary workspace={workspace} setWorkspace={setWorkspace} />
              </SectionShell>
            );
          }

          if (module.id === "content") {
            return (
              <SectionShell key={module.id} module={module} badge="Settings connected">
                <div className="space-y-5">
                  <SuccessStoriesManager />
                  <WebsiteSettings workspace={workspace} setWorkspace={setWorkspace} />
                </div>
              </SectionShell>
            );
          }

          if (module.id === "notifications") {
            return (
              <SectionShell key={module.id} module={module} badge="Alerts active">
                <div className="space-y-5">
                  <EnquiryPopupEditor />
                  <AnnouncementTickerEditor />
                  <NotificationCenter workspace={workspace} setWorkspace={setWorkspace} />
                  <div className="rounded-3xl border border-white/10 bg-card/40 p-4 lg:p-6">
                    <InstructorPage embedded initialTab={module.embeddedTab} hideTitle hideTabNav />
                  </div>
                </div>
              </SectionShell>
            );
          }

          if (module.id === "support") {
            return (
              <SectionShell key={module.id} module={module} badge="Live chat connected">
                <LiveChatInbox batches={mergedBatches} />
              </SectionShell>
            );
          }

          if (module.embeddedTab) {
            return (
              <SectionShell key={module.id} module={module} badge="Connected module">
                <div className="rounded-3xl border border-white/10 bg-card/40 p-4 lg:p-6">
                  <InstructorPage embedded initialTab={module.embeddedTab} hideTitle hideTabNav />
                </div>
              </SectionShell>
            );
          }

          return (
            <SectionShell key={module.id} module={module}>
              <PlaceholderWorkspace
                title={`${module.title} Workspace`}
                description="This module is visible now inside the admin panel with an advanced shell layout, ready for data wiring and workflows."
                cards={[
                  {
                    title: "Primary Scope",
                    text: module.points[0]
                  },
                  {
                    title: "Operations",
                    text: module.points[1]
                  },
                  {
                    title: "Expansion",
                    text: module.points[2]
                  }
                ]}
              />
            </SectionShell>
          );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
