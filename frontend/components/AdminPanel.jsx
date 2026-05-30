"use client";

import { useEffect, useMemo, useState } from "react";
import InstructorPage from "@/app/instructor/page";
import { batches } from "@/lib/fixtures";
import { logout } from "@/lib/auth";
import { buildDefaultAdminWorkspace, readAdminWorkspace, writeAdminWorkspace } from "@/lib/adminWorkspace";
import { filterDeletedCourses, readLocalCourses } from "@/lib/localCourseState";
import LocalCourseManager from "@/components/admin/LocalCourseManager";
import {
  AIInsightsPanel,
  AutomationOpsPanel,
  CouponManager,
  DashboardAnalytics,
  MediaLibrary,
  NotificationCenter,
  OnlineMockTestManager,
  OrdersAndPayments,
  SubjectCourseManager,
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
      "Student-facing notice controls"
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

function ModuleChip({ module }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.26em] text-orange-300">{module.kicker}</p>
      <h3 className="mt-2 font-display text-lg text-white">{module.title}</h3>
      <p className="mt-2 text-sm text-slate-300">{module.description}</p>
    </div>
  );
}

function SectionShell({ module, children, badge = "Visible in admin panel" }) {
  return (
    <section id={module.id} className="rounded-[30px] border border-white/10 bg-card/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.2)] lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-orange-300">{module.kicker}</p>
          <h2 className="mt-2 font-display text-3xl text-white">{module.title}</h2>
          <p className="mt-3 max-w-3xl text-sm text-slate-300">{module.description}</p>
        </div>
        <div className="rounded-2xl border border-orange-300/30 bg-orange-500/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-orange-200">Status</p>
          <p className="mt-1 text-sm font-semibold text-white">{badge}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {module.points.map((point) => (
          <div key={point} className="rounded-2xl border border-white/10 bg-[#0b1634]/70 p-4 text-sm text-slate-200">
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
      <div className="rounded-2xl border border-white/10 bg-[#0b1634]/70 p-5">
        <h3 className="font-display text-2xl text-white">{title}</h3>
        <p className="mt-3 text-sm text-slate-300">{description}</p>
      </div>
      {cards.map((card) => (
        <div key={card.title} className="rounded-2xl border border-white/10 bg-[#0b1634]/70 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{card.title}</p>
          <p className="mt-3 text-sm text-slate-200">{card.text}</p>
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
    <main className="mx-auto w-[95%] max-w-[1500px] py-8">
      <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.2),transparent_26%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_22%),linear-gradient(180deg,#111d3b_0%,#0a1227_100%)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.34)] lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-orange-300">Badam Classes Control Center</p>
            <h1 className="mt-3 font-display text-4xl text-white lg:text-6xl">Advanced Admin Panel</h1>
            <p className="mt-4 max-w-4xl text-sm text-slate-300 lg:text-base">
              All admin modules are now visible in one advanced workspace. Course management, live controls,
              notifications, and support stay functional while the rest of the modules are ready for expansion.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Logged In</p>
              <p className="mt-1 text-sm font-semibold text-white">{user?.name || user?.email || "Admin User"}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                if (typeof window !== "undefined") {
                  window.location.href = "/login";
                }
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-orange-300/40 hover:bg-orange-500/10"
            >
              Logout
            </button>
          </div>
        </div>

        {warning ? (
          <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {warning}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            { label: "Total Batches", value: formatValue(metrics.totalBatches) },
            { label: "Users", value: formatValue(metrics.totalUsers) },
            { label: "Orders", value: formatValue(metrics.totalOrders) },
            { label: "Revenue", value: `₹${formatValue(metrics.totalRevenue)}` },
            { label: "Active Batches", value: formatValue(metrics.activeBatchCount) },
            { label: "Class Sections", value: formatValue(metrics.sectionCount) },
            { label: "PDF Assets", value: formatValue(metrics.pdfCount) },
            { label: "Support Messages", value: formatValue(metrics.supportCount) },
            { label: "Notice Status", value: metrics.noticeEnabled ? "Enabled" : "Off" }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-[#0b1634]/75 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
              <p className="mt-3 font-display text-3xl text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {moduleSections.map((module) => (
            <ModuleChip key={module.id} module={module} />
          ))}
        </div>
      </section>

      <div className="mt-8 space-y-8">
        {moduleSections.map((module) => {
          if (module.id === "dashboard") {
            return (
              <SectionShell key={module.id} module={module} badge="Live overview active">
                <div className="space-y-5">
                  <DashboardAnalytics workspace={workspace} />
                  <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#0b1634]/70 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Today Snapshot</p>
                    <div className="mt-4 grid gap-3">
                      {[
                        `Total managed batches: ${formatValue(metrics.totalBatches)}`,
                        `Live-ready batches: ${formatValue(metrics.activeBatchCount)}`,
                        `Configured class sections: ${formatValue(metrics.sectionCount)}`,
                        `Support requests in chat: ${formatValue(metrics.supportCount)}`
                      ].map((item) => (
                        <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#0b1634]/70 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Quick Focus</p>
                    <div className="mt-4 grid gap-3">
                      {[
                        "Courses section lets you add batch timing, class timing, and class sections.",
                        "Live controls section manages order, live status, and batch schedule.",
                        "Notifications section controls notice and offer banner.",
                        "Support section keeps student chat visible in admin."
                      ].map((item) => (
                        <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                </div>
              </SectionShell>
            );
          }

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
                <WebsiteSettings workspace={workspace} setWorkspace={setWorkspace} />
              </SectionShell>
            );
          }

          if (module.id === "notifications") {
            return (
              <SectionShell key={module.id} module={module} badge="Alerts active">
                <div className="space-y-5">
                  <NotificationCenter workspace={workspace} setWorkspace={setWorkspace} />
                  <div className="rounded-3xl border border-white/10 bg-card/40 p-4 lg:p-6">
                    <InstructorPage embedded initialTab={module.embeddedTab} hideTitle hideTabNav />
                  </div>
                </div>
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
    </main>
  );
}
