"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CustomLivePlayer from "@/components/live/CustomLivePlayer";
import LiveClassChat from "@/components/live/LiveClassChat";
import LiveStatusChecker from "@/components/live/LiveStatusChecker";
import SecureYouTubePlayer from "@/components/live/SecureYouTubePlayer";
import { apiFetch } from "@/lib/api";
import { getToken, getUser, isAdminUser } from "@/lib/auth";
import { resolveCourseImage } from "@/lib/courseImages";
import { buildCourseRouteId, matchCourseByRoute, normalizeCourseForRoute } from "@/lib/courseIdentity";
import { batches } from "@/lib/fixtures";
import { DEFAULT_LIVE_CLASS_URL, filterDeletedCourses, filterDeletedCoursesFromStorage, readLocalCourses } from "@/lib/localCourseState";
import { hasLocalPurchase } from "@/lib/purchaseState";
import { parseYouTubeUrl } from "@/lib/youtubeEmbed";

function safeUrl(value) {
  const raw = String(value || "").trim();
  if (!/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    return parsed.hostname ? raw : "";
  } catch {
    return "";
  }
}

function normalizeLabel(value = "") {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function formatClassDate(value = "") {
  if (!value) return "Today";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function deriveNotes(course = {}) {
  const category = normalizeLabel(course.category || "");
  const teacher = course.instructor?.name || course.instructor || "Faculty";
  return [
    `Focus on ${category || "today's topic"} concepts and write down all important formulae before class ends.`,
    `Mark doubts in chat so ${teacher} ya support team follow-up kar sake.`,
    recordedFallbackUrlFromCourse(course)
      ? "Live session khatam hone ke baad isi card me recording fallback available rahegi."
      : "Recording upload hone par isi batch card se later revision access milega."
  ];
}

function recordedFallbackUrlFromCourse(course = {}) {
  return safeUrl(course?.recordedVideoUrl || course?.videoSources?.[0]?.url || course?.videos?.[0]?.url || "");
}

const canUseYouTubePlayer = (value) => Boolean(parseYouTubeUrl(safeUrl(value)));

function normalizeBatch(batch, index) {
  return normalizeCourseForRoute(
    {
      _id: batch.id,
      id: batch.id,
      slug: batch.slug || batch.routeSlug || batch.id,
      routeSlug: batch.routeSlug || batch.slug || batch.id,
      title: batch.title,
      instructor: batch.instructor,
      price: batch.priceValue,
      priceValue: batch.priceValue,
      image: batch.image,
      imageUrl: batch.imageUrl || batch.image,
      thumbnail: batch.image,
      duration: batch.duration,
      category: batch.category,
      batchTime: batch.batchTime,
      startDate: batch.startDate,
      liveClassEnabled: Boolean(batch.liveClassEnabled),
      liveClassUrl: batch.liveClassUrl,
      liveClassTitle: batch.liveClassTitle,
      liveStreamType: batch.liveStreamType || "youtube"
    },
    index
  );
}

function hasRemoteAccess(enrollments = [], course = {}) {
  const courseKeys = buildAccessKeys(course);

  return enrollments.some((item) => {
    const enrollmentKeys = [
      item?.courseRouteId,
      item?.courseId,
      item?.course?._id,
      item?.course?.id,
      item?.course?.routeId,
      item?.course?.slug,
      item?.course?.routeSlug,
      item?.course ? buildCourseRouteId(item.course) : "",
      item?.course?.title,
      item?.courseTitle
    ].map(normalizeAccessKey).filter(Boolean);
    return enrollmentKeys.some((key) => courseKeys.includes(key));
  });
}

function normalizeAccessKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

function buildAccessKeys(course = {}) {
  return Array.from(new Set([
    course.routeId,
    course._id,
    course.id,
    course.slug,
    course.routeSlug,
    course.title,
    buildCourseRouteId(course)
  ].map(normalizeAccessKey).filter(Boolean)));
}

function QuickStat({ label, value, accent = "text-white" }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function HeaderAction({ children, ...props }) {
  return (
    <button
      type="button"
      className="rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
      {...props}
    >
      {children}
    </button>
  );
}

export default function LiveClassPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params?.batchId || "";
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [message, setMessage] = useState("");
  const [theaterMode, setTheaterMode] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [attendanceNotice, setAttendanceNotice] = useState("");

  const fallbackCourses = useMemo(() => filterDeletedCourses(batches).map(normalizeBatch), []);

  useEffect(() => {
    let cancelled = false;
    const loadCourse = async () => {
      setLoading(true);
      const localCourses = filterDeletedCoursesFromStorage(readLocalCourses()).map((item, index) =>
        normalizeCourseForRoute({ ...item, image: resolveCourseImage(item), thumbnail: resolveCourseImage(item) }, index)
      );
      const fallbackMatch = matchCourseByRoute([...localCourses, ...fallbackCourses], batchId);
      if (fallbackMatch && !cancelled) setCourse(fallbackMatch);

      try {
        const data = await apiFetch(`/courses/${encodeURIComponent(batchId)}`);
        const remoteCourse = normalizeCourseForRoute(data?.course || data);
        if (!cancelled) setCourse({ ...fallbackMatch, ...remoteCourse });
      } catch {
        if (!fallbackMatch && !cancelled) setCourse(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCourse();
    return () => {
      cancelled = true;
    };
  }, [batchId, fallbackCourses]);

  useEffect(() => {
    let cancelled = false;
    const checkAccess = async () => {
      if (!course) return;
      const user = getUser();
      const token = getToken();
      if (!user || !token) {
        setHasAccess(false);
        setMessage("Live class dekhne ke liye pehle login karein.");
        return;
      }
      if (isAdminUser(user) || hasLocalPurchase(course)) {
        setHasAccess(true);
        setMessage("");
        return;
      }
      try {
        const [enrollmentResult, dashboardResult] = await Promise.allSettled([
          apiFetch("/enrollments/my"),
          apiFetch("/student/dashboard")
        ]);
        const enrollments = enrollmentResult.status === "fulfilled" && Array.isArray(enrollmentResult.value)
          ? enrollmentResult.value
          : [];
        const dashboardEnrollments =
          dashboardResult.status === "fulfilled" && Array.isArray(dashboardResult.value?.purchasedCourses)
            ? dashboardResult.value.purchasedCourses
            : [];
        const allowed = hasRemoteAccess([...enrollments, ...dashboardEnrollments], course);
        if (!cancelled) {
          setHasAccess(allowed);
          setMessage(allowed ? "" : "Is live class ke liye batch enrollment required hai.");
        }
      } catch {
        if (!cancelled) {
          setHasAccess(false);
          setMessage("Enrollment verify nahi ho saka. Login refresh karke dobara try karein.");
        }
      }
    };
    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [course]);

  const routeId = course?.routeId || buildCourseRouteId(course || {});
  const liveEnabled = Boolean(course?.liveClassEnabled);
  const liveUrl = liveEnabled ? safeUrl(course?.liveClassUrl || DEFAULT_LIVE_CLASS_URL) : "";
  const liveStreamType = ["youtube", "hls", "mp4"].includes(String(course?.liveStreamType || "").toLowerCase())
    ? String(course.liveStreamType).toLowerCase()
    : "youtube";
  const recordedFallbackUrl = recordedFallbackUrlFromCourse(course);
  const canWatch = Boolean(hasAccess && liveEnabled && liveUrl);
  const teacherName = course?.instructor?.name || course?.instructor || "BadamClasses Faculty";
  const classTitle = course?.liveClassTitle || course?.title || "Live Class";
  const batchLabel = normalizeLabel(course?.category || "") || "Premium batch";
  const scheduleLabel = course?.batchTime || course?.startDate || "Schedule will be updated";
  const heroImage = resolveCourseImage(course);
  const notes = deriveNotes(course);

  useEffect(() => {
    if (!routeId || typeof window === "undefined") return;
    const attendanceKey = `badamclasses_attendance_${routeId}`;
    const storedValue = window.localStorage.getItem(attendanceKey);
    setAttendanceMarked(Boolean(storedValue));
  }, [routeId]);

  const markAttendance = () => {
    if (!routeId || typeof window === "undefined") return;
    const attendanceKey = `badamclasses_attendance_${routeId}`;
    const timestamp = new Date().toISOString();
    window.localStorage.setItem(attendanceKey, timestamp);
    setAttendanceMarked(true);
    setAttendanceNotice(`Attendance marked at ${new Date(timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020816] px-4 py-6 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-6">
            <div className="h-8 w-64 rounded-full bg-white/10" />
            <div className="mt-4 h-4 w-40 rounded-full bg-white/10" />
            <div className="mt-8 aspect-video rounded-[28px] bg-white/10" />
          </div>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="min-h-screen bg-[#020816] px-4 py-10 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,#08142c_0%,#071023_55%,#111827_100%)] p-8 text-center shadow-[0_30px_90px_rgba(2,6,23,0.45)]">
          <h1 className="font-display text-3xl text-white">Live batch not found</h1>
          <p className="mt-3 text-sm text-slate-300">Requested class page abhi available nahi hai.</p>
          <Link href="/courses" className="mt-6 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white">
            Browse Courses
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      onContextMenu={(event) => event.preventDefault()}
      className={`min-h-screen bg-[radial-gradient(circle_at_top,#11254f_0%,#071226_32%,#020816_72%)] text-slate-100 ${theaterMode ? "px-0 py-0" : "px-4 py-5 sm:px-6 sm:py-8"}`}
    >
      <section className={`${theaterMode ? "mx-0 max-w-none rounded-none border-0" : "mx-auto max-w-7xl rounded-[36px] border border-white/10"} overflow-hidden bg-[linear-gradient(145deg,#08142c_0%,#081224_38%,#030712_100%)] shadow-[0_36px_120px_rgba(2,6,23,0.55)]`}>
        {!theaterMode ? (
          <div className="relative overflow-hidden border-b border-white/10 px-5 py-6 sm:px-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.16),transparent_32%)]" />
            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex rounded-full border px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${liveEnabled ? "border-red-300/45 bg-red-500/15 text-red-100" : "border-white/15 bg-white/10 text-slate-300"}`}>
                    {liveEnabled ? "LIVE NOW" : "RECORDING READY"}
                  </span>
                  <span className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-100">
                    {batchLabel}
                  </span>
                </div>
                <h1 className="mt-4 max-w-4xl font-display text-3xl leading-tight text-white sm:text-4xl xl:text-[2.9rem]">
                  {classTitle}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
                  <span>Teacher: <span className="font-semibold text-white">{teacherName}</span></span>
                  <span>Batch: <span className="font-semibold text-white">{course.title}</span></span>
                  <span>Date: <span className="font-semibold text-white">{formatClassDate(course.startDate)}</span></span>
                </div>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[25rem]">
                <QuickStat label="Class Timing" value={scheduleLabel} />
                <QuickStat label="Access" value={hasAccess ? "Enrolled student" : "Locked"} accent={hasAccess ? "text-emerald-300" : "text-orange-200"} />
                <QuickStat label="Teacher" value={teacherName} />
                <QuickStat label="Recording" value={recordedFallbackUrl ? "Available after live" : "Upload pending"} accent="text-cyan-200" />
              </div>
            </div>
          </div>
        ) : null}

        <div className={`${theaterMode ? "p-0" : "grid gap-0 xl:grid-cols-[minmax(0,1.2fr)_360px]"}`}>
          <section className="min-w-0 border-r border-white/10">
            <div className={`${theaterMode ? "" : "p-4 sm:p-6"}`}>
              <div className={`${theaterMode ? "rounded-none border-0" : "rounded-[30px] border border-white/10"} overflow-hidden bg-[#020617]`}>
                {!theaterMode ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[linear-gradient(90deg,rgba(8,20,44,0.96),rgba(3,7,18,0.92))] px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.26em] text-cyan-200">Premium live classroom</p>
                      <p className="mt-1 truncate text-sm text-slate-300">{course.title} with {teacherName}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <HeaderAction onClick={() => setPlayerKey((value) => value + 1)}>Refresh stream</HeaderAction>
                      <HeaderAction onClick={() => setTheaterMode((value) => !value)}>Theater mode</HeaderAction>
                    </div>
                  </div>
                ) : null}

                <div className="relative">
                  {canWatch ? (
                    liveStreamType === "youtube" && canUseYouTubePlayer(liveUrl) ? (
                      <LiveStatusChecker sourceUrl={liveUrl}>
                        {({ status, loading: statusLoading, refresh }) => (
                          <SecureYouTubePlayer
                            sourceUrl={liveUrl}
                            title={classTitle}
                            liveStatus={status}
                            loading={statusLoading}
                            playerKey={playerKey}
                            onRefresh={() => {
                              setPlayerKey((value) => value + 1);
                              refresh();
                            }}
                            recordedFallbackUrl={recordedFallbackUrl}
                            className={`${theaterMode ? "h-screen" : "aspect-video"} w-full bg-black`}
                            fallbackClassName={theaterMode ? "h-screen" : "aspect-video"}
                          />
                        )}
                      </LiveStatusChecker>
                    ) : liveStreamType === "hls" || liveStreamType === "mp4" ? (
                      <CustomLivePlayer
                        sourceUrl={liveUrl}
                        streamType={liveStreamType}
                        title={classTitle}
                        className={`${theaterMode ? "h-screen" : "aspect-video"} w-full bg-black`}
                      />
                    ) : (
                      <div className={`${theaterMode ? "h-screen" : "aspect-video"} flex items-center justify-center bg-[#050816] p-6 text-center`}>
                        <div className="max-w-xl">
                          <p className="text-sm uppercase tracking-[0.28em] text-orange-300">Unsupported Live Source</p>
                          <h2 className="mt-3 font-display text-3xl text-white">Stream type aur live URL match nahi kar rahe.</h2>
                          <p className="mt-3 text-sm text-slate-300">Admin panel me YouTube, HLS / m3u8, ya MP4 type ke saath matching URL save karein.</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className={`${theaterMode ? "h-screen" : "aspect-video"} flex items-center justify-center bg-[#050816] p-6 text-center`}>
                      <div className="max-w-xl">
                        <p className="text-sm uppercase tracking-[0.28em] text-orange-300">Access Protected</p>
                        <h2 className="mt-3 font-display text-3xl text-white">{!liveEnabled ? "Live class abhi start nahi hui hai." : "Live class locked hai."}</h2>
                        <p className="mt-3 text-sm text-slate-300">{message || "Admin live start karega tab enrolled students yahan class dekh payenge."}</p>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                          {!getToken() ? (
                            <button type="button" onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/live/${batchId}`)}`)} className="rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white">
                              Login
                            </button>
                          ) : null}
                          <Link href={`/checkout?course=${encodeURIComponent(routeId || batchId)}`} className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white">
                            Enroll Batch
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {!theaterMode ? (
                    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                      <div className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-white backdrop-blur">
                        {liveEnabled ? "LIVE CLASS" : "RECORDED REVIEW"}
                      </div>
                      <div className="rounded-full border border-cyan-300/30 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-100 backdrop-blur">
                        {teacherName}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {!theaterMode ? (
                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">Class notes</p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">Today’s session guide</h2>
                      </div>
                      <Link href={`/courses/${encodeURIComponent(routeId || batchId)}`} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-orange-300/40 hover:text-white">
                        Batch details
                      </Link>
                    </div>
                    <div className="mt-5 grid gap-3">
                      {notes.map((item) => (
                        <div key={item} className="rounded-2xl border border-white/10 bg-[#081223] px-4 py-3 text-sm leading-6 text-slate-200">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,21,38,0.94),rgba(8,18,35,0.94))] p-5">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-orange-200">Attendance</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">Mark presence</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">Class start hone ke baad attendance mark karke daily consistency track rakhein.</p>
                      <button
                        type="button"
                        onClick={markAttendance}
                        disabled={!hasAccess || attendanceMarked}
                        className="mt-5 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {attendanceMarked ? "Attendance Marked" : "Mark Attendance"}
                      </button>
                      <p className="mt-3 text-xs text-slate-400">{attendanceNotice || (attendanceMarked ? "Attendance saved on this device." : "Attendance button enabled for enrolled students.")}</p>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200">Class assets</p>
                      <img src={heroImage} alt={course.title} className="mt-4 h-36 w-full rounded-[22px] object-cover" />
                      <p className="mt-4 text-base font-semibold text-white">{course.title}</p>
                      <p className="mt-1 text-sm text-slate-300">Teacher: {teacherName}</p>
                      <p className="mt-1 text-sm text-slate-300">Schedule: {scheduleLabel}</p>
                      <p className="mt-4 rounded-2xl border border-white/10 bg-[#081223] px-4 py-3 text-sm text-slate-300">
                        {recordedFallbackUrl ? "Recording will automatically appear in the same player card when live stream is offline." : "Recorded lecture upload hone par yahi batch access card active rahega."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {!theaterMode ? (
            <aside className="min-h-[860px] bg-[linear-gradient(180deg,#081121_0%,#050b18_100%)]">
              {hasAccess ? (
                <LiveClassChat batchId={routeId || batchId} title={classTitle} teacherName={teacherName} />
              ) : (
                <div className="p-5">
                  <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Why locked?</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Join the batch to unlock live classroom</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">Streaming, notes, attendance aur discussion panel sirf enrolled students aur admins ke liye available hai.</p>
                    <div className="mt-5 space-y-3">
                      <QuickStat label="Faculty" value={teacherName} />
                      <QuickStat label="Schedule" value={scheduleLabel} />
                      <QuickStat label="Mode" value={liveEnabled ? "Live in progress" : "Waiting for class"} accent={liveEnabled ? "text-red-200" : "text-slate-200"} />
                    </div>
                    <Link href={`/checkout?course=${encodeURIComponent(routeId || batchId)}`} className="mt-5 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white">
                      Continue to checkout
                    </Link>
                  </div>
                </div>
              )}
            </aside>
          ) : null}
        </div>
      </section>
    </main>
  );
}
