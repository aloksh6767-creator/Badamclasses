"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { resolveCourseImage } from "@/lib/courseImages";
import { buildCourseReactKey, buildCourseRouteId, matchCourseByRoute, normalizeCourseForRoute } from "@/lib/courseIdentity";
import { batches } from "@/lib/fixtures";
import { filterDeletedCourses, filterDeletedCoursesFromStorage, readDeletedCourseKeys, readLocalCourses } from "@/lib/localCourseState";
import { readLocalPurchases, saveLocalPurchase } from "@/lib/purchaseState";

const dedupeCourses = (items = []) => {
  const seen = new Set();
  return items.filter((course, index) => {
    const key = `${buildCourseRouteId(course, index)}::${String(course?.title || "").trim().toLowerCase()}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeBatchText = (value) => String(value || "").trim().toLowerCase();

const isRecordedBatch = (course = {}) =>
  normalizeBatchText(`${course.title} ${course.category}`).includes("recorded") ||
  Boolean(course.recordedVideoUrl);

const isLiveBatch = (course = {}) =>
  Boolean(course.liveClassUrl) ||
  (!isRecordedBatch(course) && Boolean(course.batchTime || course.startDate));

const formatMinutes = (value) => {
  const total = Number(value || 0);
  return `${total.toFixed(total >= 100 ? 0 : 2)} mins`;
};

const liveStudioStats = [
  { label: "Live classes", value: "06", detail: "This week" },
  { label: "Doubt solved", value: "128", detail: "AI + mentor" },
  { label: "Mock rank", value: "#24", detail: "Batch board" },
  { label: "Study streak", value: "15", detail: "Days active" }
];

const liveExperienceFeatures = [
  "HD live video player",
  "Realtime class chat",
  "Doubt queue",
  "Teacher focus mode",
  "Auto attendance",
  "Class recordings",
  "PDF notes",
  "Progress tracker"
];

const aiLearningTools = [
  { title: "AI Doubt Solver", text: "Ask a topic or question and get a clean step-by-step explanation." },
  { title: "Smart Revision", text: "Daily weak-topic recommendations from class activity and mock results." },
  { title: "Mock Analysis", text: "Score, speed, accuracy, and topic-level improvement hints in one place." },
  { title: "Study Planner", text: "Auto generated study roadmap for live classes, recorded videos, and practice." }
];

const upcomingClassCards = [
  { title: "Maths Live Class", time: "Today 7:00 PM", teacher: "Badam Sir", tag: "Live" },
  { title: "Reasoning Practice", time: "Tomorrow 8:00 PM", teacher: "Faculty Team", tag: "Upcoming" },
  { title: "Weekly Mock Review", time: "Sunday 10:00 AM", teacher: "Exam Desk", tag: "Analysis" }
];

const performanceBars = [
  { label: "Attendance", value: 92 },
  { label: "Assignments", value: 78 },
  { label: "Mock accuracy", value: 84 },
  { label: "Revision health", value: 69 }
];

function PremiumLiveStudio({ course, completionPercent, watchTimeMinutes }) {
  const focusTitle = course?.title || "Badam Classes Live Batch";
  const focusImage = course ? resolveCourseImage(course) : "/new-logo.png";

  return (
    <section className="mt-6 overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,#08111f_0%,#101b31_45%,#07111f_100%)] shadow-[0_30px_90px_rgba(2,6,23,0.42)]">
      <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="relative min-h-[520px] overflow-hidden bg-slate-950">
          <img src={focusImage} alt={focusTitle} className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.28),transparent_30%),linear-gradient(120deg,rgba(2,6,23,0.92),rgba(8,17,38,0.66)_58%,rgba(2,6,23,0.88))]" />

          <div className="relative z-10 flex min-h-[520px] flex-col justify-between p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-300/35 bg-red-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-red-100">
                <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_16px_rgba(248,113,113,0.9)]" />
                Live Studio
              </div>
              <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100">
                Full HD Class
              </div>
            </div>

            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">Premium class dashboard</p>
              <h2 className="mt-4 max-w-[13ch] font-display text-5xl leading-[0.94] text-white md:text-7xl">
                {focusTitle}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 md:text-lg">
                Join live classes, watch recordings, download notes, ask doubts, and track every study signal from one polished student workspace.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={course?.liveClassEnabled && course?.routeId ? `/live/${encodeURIComponent(course.routeId)}` : "/courses"}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-orange-100"
                >
                  Join Class
                </Link>
                <Link
                  href={course?.routeId ? `/learn/${encodeURIComponent(course.routeId)}` : "/dashboard"}
                  className="rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-orange-300/45"
                >
                  Open Course
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              {liveStudioStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-2xl font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-300">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid content-start gap-5 p-5 md:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Learning pulse</p>
              <p className="mt-4 font-display text-5xl text-white">{completionPercent.toFixed(1)}%</p>
              <p className="mt-2 text-sm text-slate-300">Overall completion</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Watch time</p>
              <p className="mt-4 font-display text-5xl text-white">{formatMinutes(watchTimeMinutes)}</p>
              <p className="mt-2 text-sm text-slate-300">Focused study minutes</p>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#081127]/80 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-orange-300">Class features</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Live class controls</h3>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                Student ready
              </span>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {liveExperienceFeatures.map((feature) => (
                <div key={feature} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-slate-200">
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#081127]/80 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Performance</p>
            <div className="mt-4 grid gap-4">
              {performanceBars.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-200">{item.label}</span>
                    <span className="font-semibold text-white">{item.value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-400 via-cyan-300 to-emerald-300" style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardExperienceGrid() {
  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,#10192c_0%,#0c1322_100%)] p-5 shadow-[0_26px_70px_rgba(2,6,23,0.28)]">
        <p className="text-xs uppercase tracking-[0.28em] text-orange-300">Upcoming stream</p>
        <h2 className="mt-3 font-display text-4xl text-white">Class Schedule</h2>
        <div className="mt-5 grid gap-3">
          {upcomingClassCards.map((item) => (
            <div key={item.title} className="rounded-[26px] border border-white/10 bg-white/[0.045] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{item.teacher}</p>
                  <p className="mt-2 text-sm font-semibold text-orange-200">{item.time}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {item.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,#10192c_0%,#0c1322_100%)] p-5 shadow-[0_26px_70px_rgba(2,6,23,0.28)]">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Advanced AI tools</p>
        <h2 className="mt-3 font-display text-4xl text-white">Smarter Preparation</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {aiLearningTools.map((tool) => (
            <article key={tool.title} className="rounded-[26px] border border-white/10 bg-white/[0.045] p-5">
              <h3 className="text-xl font-semibold text-white">{tool.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{tool.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardBatchCard({ course, variant = "default", badge = "" }) {
  const routeId = course.routeId || buildCourseRouteId(course);
  const instructorName = course.instructor?.name || course.instructor || "BadamClasses";
  const image = resolveCourseImage(course);
  const accentClass =
    variant === "live"
      ? "from-emerald-300 via-cyan-300 to-sky-300"
      : variant === "recorded"
        ? "from-orange-300 via-amber-200 to-yellow-200"
        : "from-fuchsia-300 via-violet-300 to-cyan-300";
  const toneClass =
    variant === "live"
      ? "from-emerald-500/18 via-slate-900/70 to-slate-950"
      : variant === "recorded"
        ? "from-orange-500/18 via-slate-900/70 to-slate-950"
        : "from-fuchsia-500/16 via-slate-900/70 to-slate-950";
  const cardHref = `/learn/${encodeURIComponent(routeId || course._id || course.id)}`;

  return (
    <Link
      href={cardHref}
      className="group relative block overflow-hidden rounded-[30px] border border-white/10 bg-slate-950 shadow-[0_24px_60px_rgba(2,6,23,0.42)] transition duration-300 hover:-translate-y-1 hover:border-white/20"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${toneClass}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.14),transparent_26%)]" />

      <div className="relative z-10 flex min-h-[230px] flex-col gap-6 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className={`mb-4 inline-flex rounded-full bg-gradient-to-r ${accentClass} px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-950`}>
              {variant === "live" ? "Live Access" : variant === "recorded" ? "Recorded Library" : "Smart Batch"}
            </div>
            <h3 className="max-w-[16ch] text-2xl font-semibold leading-tight text-white">{course.title}</h3>
            <p className="mt-3 text-sm text-slate-300">Mentor: {instructorName}</p>
          </div>
          {badge ? (
            <span className="rounded-full bg-red-500 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(239,68,68,0.32)]">
              {badge}
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Schedule</p>
                <p className="mt-2 text-lg font-semibold text-white">{course.batchTime || course.startDate || "Flexible Start"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Duration</p>
                <p className="mt-2 text-lg font-semibold text-white">{course.duration || `${course.months || 12} Months`}</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-slate-900/70">
            <img src={image} alt={course.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              {course.category || "General"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              ₹{Number(course.price || course.priceValue || 0).toLocaleString("en-IN")}
            </span>
          </div>
          <span className={`rounded-full bg-gradient-to-r ${accentClass} px-4 py-2 text-sm font-semibold text-slate-950`}>
            {variant === "live" && course.liveClassEnabled ? "Join Live" : variant === "live" ? "Open Live" : variant === "recorded" ? "Watch Now" : "Explore Batch"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [dashboard, setDashboard] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [status, setStatus] = useState("loading");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [fallbackNotice, setFallbackNotice] = useState("");
  const [activeView, setActiveView] = useState("my-batches");
  const [localPurchases, setLocalPurchases] = useState([]);
  const [deletedCourseKeys, setDeletedCourseKeys] = useState([]);

  const mergedPurchasedCourses = useMemo(() => {
    const remotePurchased = Array.isArray(dashboard?.purchasedCourses) ? dashboard.purchasedCourses : [];
    const localEnrollmentMap = new Map();

    localPurchases.forEach((purchase, index) => {
      const matchedCourse =
        matchCourseByRoute(allCourses, purchase.routeId || purchase.courseId || purchase.id || purchase.title) ||
        allCourses.find((course) => String(course.title || "").trim().toLowerCase() === String(purchase.title || "").trim().toLowerCase());

      if (!matchedCourse) return;

      const key = String(matchedCourse._id || matchedCourse.id || matchedCourse.routeId || purchase.title).trim().toLowerCase();
      localEnrollmentMap.set(key, {
        _id: `local-${key || index}`,
        progress: 0,
        completed: false,
        paymentId: "free-local",
        course: matchedCourse
      });
    });

    remotePurchased.forEach((enrollment) => {
      const key = String(
        enrollment?.course?._id || enrollment?.course?.id || enrollment?.course?.routeId || enrollment?.course?.title || enrollment?._id || ""
      )
        .trim()
        .toLowerCase();
      if (key) {
        localEnrollmentMap.set(key, enrollment);
      }
    });

    return Array.from(localEnrollmentMap.values());
  }, [allCourses, dashboard, localPurchases]);

  const fallbackCourses = useMemo(() => {
    return filterDeletedCourses(batches, deletedCourseKeys).map((batch, index) =>
      normalizeCourseForRoute(
        {
          _id: batch.id,
          title: batch.title,
          instructor: batch.instructor,
          price: batch.priceValue,
          image: batch.image,
          ratingAverage: 4.8,
          ratingCount: 200,
          batchTime: batch.batchTime,
          startDate: batch.startDate,
          liveClassEnabled: Boolean(batch.liveClassEnabled),
          liveClassUrl: batch.liveClassUrl,
          liveClassTitle: batch.liveClassTitle
        },
        index
      )
    );
  }, [deletedCourseKeys]);

  const dashboardCoursePool = useMemo(() => {
    return status === "ready"
      ? dedupeCourses(mergedPurchasedCourses.map((item) => item.course).filter(Boolean))
      : allCourses;
  }, [allCourses, mergedPurchasedCourses, status]);

  const liveBatches = useMemo(
    () => dashboardCoursePool.filter((course) => isLiveBatch(course)),
    [dashboardCoursePool]
  );

  const recordedBatches = useMemo(
    () => dashboardCoursePool.filter((course) => isRecordedBatch(course)),
    [dashboardCoursePool]
  );

  const currentBatches = useMemo(() => {
    switch (activeView) {
      case "live":
        return liveBatches;
      case "recorded":
        return recordedBatches;
      case "all-batches":
        return dashboardCoursePool;
      default:
        return mergedPurchasedCourses.map((item) => item.course).filter(Boolean);
    }
  }, [activeView, dashboardCoursePool, liveBatches, mergedPurchasedCourses, recordedBatches]);

  const completionPercent = useMemo(() => {
    if (!mergedPurchasedCourses.length) return 0;
    const total = mergedPurchasedCourses.reduce((sum, item) => sum + Number(item.progress || 0), 0);
    return total / mergedPurchasedCourses.length;
  }, [mergedPurchasedCourses]);

  const watchTimeMinutes = useMemo(() => {
    if (!mergedPurchasedCourses.length) return 0;
    return mergedPurchasedCourses.reduce((sum, item) => {
      const progress = Number(item.progress || 0);
      const months = Number(item.course?.months || 8);
      return sum + progress * months * 1.8;
    }, 0);
  }, [mergedPurchasedCourses]);

  const levelLabel = completionPercent >= 70 ? "Advanced" : completionPercent >= 35 ? "Intermediate" : "Beginner";
  const completionLabel = completionPercent >= 70 ? "Excellent momentum" : completionPercent >= 35 ? "Strong progress" : "Just getting started";
  const liveFocusBatch = liveBatches[0] || currentBatches[0] || allCourses[0] || null;

  const tabItems = [
    { id: "my-batches", label: "My Batches" },
    { id: "all-batches", label: "All Batches" },
    { id: "live", label: "Live" },
    { id: "recorded", label: "Recorded" }
  ];

  const loadDashboard = async () => {
    try {
      const result = await apiFetch("/student/dashboard");
      setDashboard(result);
      setStatus("ready");
    } catch {
      setDashboard(null);
      setStatus("guest");
    }
  };

  const loadCourses = async () => {
    const localCourses = filterDeletedCoursesFromStorage(readLocalCourses()).map((course, index) =>
      normalizeCourseForRoute(
        {
          _id: course._id,
          id: course.id,
          slug: course.slug,
          title: course.title,
          instructor: course.instructor || "BadamClasses",
          price: Number(course.price || 0),
          image: resolveCourseImage(course),
          ratingAverage: 4.8,
          ratingCount: 240,
          batchTime: course.batchTime,
          startDate: course.startDate,
          liveClassEnabled: Boolean(course.liveClassEnabled),
          liveClassUrl: course.liveClassUrl,
          liveClassTitle: course.liveClassTitle
        },
        index
      )
    );

    try {
      const result = await apiFetch("/courses");
      const remoteCourses = Array.isArray(result)
        ? result.map((course, index) => normalizeCourseForRoute(course, index))
        : [];
      setAllCourses(dedupeCourses([...localCourses, ...filterDeletedCourses(remoteCourses), ...fallbackCourses]));
      setFallbackNotice("");
    } catch {
      setAllCourses(dedupeCourses([...localCourses, ...fallbackCourses]));
      setFallbackNotice("Live courses are unavailable. Showing featured batches instead.");
    }
  };

  const processPaymentSuccess = async () => {
    const payment = searchParams.get("payment") || searchParams.get("purchase");
    const courseId = searchParams.get("course") || searchParams.get("courseId");
    const sessionId = searchParams.get("session_id");
    const isLocalPurchase = searchParams.get("local") === "1";
    const manual = searchParams.get("manual") === "1";

    if (payment !== "success" || !courseId) {
      return;
    }

    if (!sessionId && !manual && !isLocalPurchase) {
      setPaymentNotice("Payment successful. Course unlocked in My Courses.");
      return;
    }

    try {
      await apiFetch("/payments/confirm-session", {
        method: "POST",
        body: JSON.stringify({
          courseId,
          sessionId,
          manual
        })
      });
      setPaymentNotice("Payment successful. Course unlocked in My Courses.");
    } catch (error) {
      if (isLocalPurchase) {
        saveLocalPurchase({
          routeId: courseId,
          _id: courseId,
          title: courseId
        });
        setPaymentNotice("Free purchase successful. Course added to My Courses.");
      } else {
        setPaymentNotice(`Payment received but unlock failed: ${error.message}`);
      }
    }
  };

  useEffect(() => {
    (async () => {
      await processPaymentSuccess();
      setDeletedCourseKeys(readDeletedCourseKeys());
      setLocalPurchases(readLocalPurchases());
      await Promise.all([loadDashboard(), loadCourses()]);
      setStatus((prev) => (prev === "loading" ? "guest" : prev));
    })();
  }, []);

  if (status === "loading") {
    return <main className="mx-auto w-[92%] max-w-6xl py-10">Loading dashboard...</main>;
  }

  const visibleCourses = currentBatches.length ? currentBatches : activeView === "my-batches" ? dashboardCoursePool : currentBatches;
  const visibleLiveBatches = (activeView === "recorded" ? [] : visibleCourses.filter((course) => isLiveBatch(course))).slice(0, 6);
  const visibleRecordedBatches = (activeView === "live" ? [] : visibleCourses.filter((course) => isRecordedBatch(course))).slice(0, 6);
  const showEmptyState = !visibleLiveBatches.length && !visibleRecordedBatches.length;
  const headerTitle =
    activeView === "my-batches"
      ? "My Batches"
      : activeView === "live"
        ? "Live Batches"
        : activeView === "recorded"
          ? "Recorded Batches"
          : "All Batches";

  const renderBatchCard = (course, index, variant = "live") => {
    const routeId = course.routeId || buildCourseRouteId(course, index);
    const href = `/learn/${encodeURIComponent(routeId || course._id || course.id)}`;
    const instructorName = course.instructor?.name || course.instructor || "BadamClasses Team";
    const isGreen = variant === "live" && index % 2 === 1;

    return (
      <Link
        key={buildCourseReactKey(course, index, `dashboard-${variant}`)}
        href={href}
        className={`group relative min-h-[152px] overflow-hidden rounded-xl border border-white/10 shadow-[0_18px_34px_rgba(2,6,23,0.28)] transition hover:-translate-y-1 hover:border-white/30 ${
          variant === "recorded" || !isGreen ? "bg-red-950" : "bg-emerald-950"
        }`}
      >
        <img src={resolveCourseImage(course)} alt={course.title} className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-500 group-hover:scale-105" />
        <div
          className={`absolute inset-0 ${
            variant === "recorded" || !isGreen
              ? "bg-gradient-to-r from-red-950/95 via-red-900/78 to-red-700/20"
              : "bg-gradient-to-r from-emerald-950/96 via-emerald-900/76 to-lime-500/18"
          }`}
        />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/10 to-transparent" />

        <div className="relative z-10 flex h-full min-h-[152px] items-end justify-between gap-4 p-4">
          <div className="min-w-0 pb-1">
            <h3 className="line-clamp-2 max-w-[22rem] text-lg font-semibold leading-snug text-white md:text-xl">{course.title}</h3>
            <div className="mt-3 inline-flex max-w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-950">
              <span className="truncate">By {instructorName}</span>
            </div>
          </div>
          <div className="hidden w-28 shrink-0 overflow-hidden rounded-xl border border-white/40 bg-white/10 md:block">
            <img src={resolveCourseImage(course)} alt="" className="h-28 w-full object-cover" />
          </div>
        </div>
      </Link>
    );
  };

  return (
    <main className="relative min-h-screen bg-[#111827] px-4 pb-16 pt-5 text-white md:px-8">
      <h1 className="text-center text-2xl font-bold text-white">{headerTitle}</h1>

      <div className="mt-3 overflow-x-auto border-b border-white/80">
        <div className="flex min-w-max items-end gap-0">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className={`border-b-2 px-5 py-4 text-base font-bold transition md:px-7 md:text-xl ${
                activeView === tab.id
                  ? "border-sky-400 bg-white text-black"
                  : "border-transparent text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {paymentNotice ? (
        <div className="mt-5 rounded-2xl border border-emerald-300/40 bg-emerald-500/10 p-4 text-emerald-100">
          {paymentNotice}
        </div>
      ) : null}

      {status !== "ready" ? (
        <div className="mt-5 rounded-2xl border border-orange-300/40 bg-orange-500/10 p-4 text-orange-100">
          Login to see purchased courses. You can still browse all courses below and purchase.
          <div className="mt-3 flex gap-2">
            <Link href="/login" className="rounded-lg border border-white/25 px-3 py-2 text-sm text-white">Login</Link>
            <Link href="/courses" className="rounded-lg bg-accent px-3 py-2 text-sm text-white">Browse Courses</Link>
          </div>
        </div>
      ) : null}

      {fallbackNotice ? (
        <div className="mt-5 rounded-2xl border border-orange-300/30 bg-orange-500/10 px-5 py-4 text-base text-orange-100">
          {fallbackNotice}
        </div>
      ) : null}

      <section className="mt-6 rounded-md bg-[#eaf8ff] px-5 py-5 text-black shadow-[0_12px_28px_rgba(2,6,23,0.18)]">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 text-red-600">
            <path d="M4 6.5 12 3l8 3.5-8 3.5L4 6.5Zm3 3v5.5c0 1.8 2.2 3.3 5 3.3s5-1.5 5-3.3V9.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 className="text-2xl font-bold md:text-3xl">Journey so far</h2>
        </div>
        <div className="mt-8 grid gap-5 text-center md:grid-cols-3 md:divide-x md:divide-slate-300">
          <div>
            <p className="text-2xl font-semibold">{levelLabel}</p>
            <p className="mt-3 text-lg text-slate-700">Level</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{completionPercent.toFixed(2)}%</p>
            <p className="mt-3 text-lg text-slate-700">Overall Completion</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{formatMinutes(watchTimeMinutes)}</p>
            <p className="mt-3 text-lg text-slate-700">Watch Time</p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9 text-green-500">
            <path d="M4 5h16v11H4V5Zm4 15h8m-4-4v4M9 9l5 2.5L9 14V9Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 className="text-2xl font-bold md:text-3xl">Live Batches</h2>
        </div>
        {visibleLiveBatches.length ? (
          <div className="mt-6 grid gap-7 lg:grid-cols-2">
            {visibleLiveBatches.map((course, index) => renderBatchCard(course, index, "live"))}
          </div>
        ) : null}
      </section>

      {visibleRecordedBatches.length ? (
        <section className="mt-10">
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9 text-orange-400">
              <path d="M5 5h14v14H5V5Zm5 4 5 3-5 3V9Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 className="text-2xl font-bold md:text-3xl">Recorded Batches</h2>
          </div>
          <div className="mt-6 grid gap-7 lg:grid-cols-2">
            {visibleRecordedBatches.map((course, index) => renderBatchCard(course, index, "recorded"))}
          </div>
        </section>
      ) : null}

      {showEmptyState ? (
        <div className="mt-10 rounded-xl border border-dashed border-white/20 bg-white/5 px-5 py-8 text-lg text-slate-200">
          {activeView === "my-batches"
            ? "No purchased batches yet. Enroll in a batch to see your private learning queue here."
            : "No batches available in this section right now."}
        </div>
      ) : null}

      <div className="fixed right-0 top-1/3 z-30 hidden overflow-hidden rounded-l-xl border border-white/10 bg-slate-800/90 shadow-2xl backdrop-blur md:block">
        {["YT", "IG", "TG", "TW"].map((item, index) => (
          <div key={item} className={`flex h-14 w-16 items-center justify-center border-b border-white/10 text-sm font-bold text-white ${index === 0 ? "bg-red-500" : index === 1 ? "bg-pink-500" : index === 2 ? "bg-sky-500" : "bg-blue-500"}`}>
            {item}
          </div>
        ))}
      </div>
    </main>
  );
}
