"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
      liveClassTitle: batch.liveClassTitle
    },
    index
  );
}

function hasRemoteAccess(enrollments = [], course = {}) {
  const courseKeys = [course.routeId, course._id, course.id, course.slug, course.title]
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);

  return enrollments.some((item) => {
    const enrollmentKeys = [
      item?.courseRouteId,
      item?.courseId,
      item?.course?._id,
      item?.course?.id,
      item?.course?.routeId,
      item?.course?.title,
      item?.courseTitle
    ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
    return enrollmentKeys.some((key) => courseKeys.includes(key));
  });
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
        const enrollments = await apiFetch("/enrollments/my");
        const allowed = Array.isArray(enrollments) && hasRemoteAccess(enrollments, course);
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
  const recordedFallbackUrl = safeUrl(course?.recordedVideoUrl || course?.videoSources?.[0]?.url || course?.videos?.[0]?.url || "");
  const canWatch = Boolean(hasAccess && liveEnabled && liveUrl);

  if (loading) {
    return (
      <main className="mx-auto w-[92%] max-w-6xl py-10 text-slate-100">
        <div className="animate-pulse rounded-[32px] border border-white/10 bg-[#0b1634]/80 p-8">
          <div className="h-8 w-56 rounded bg-white/10" />
          <div className="mt-6 aspect-video rounded-[24px] bg-white/10" />
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="mx-auto w-[92%] max-w-5xl py-10 text-slate-100">
        <div className="rounded-[28px] border border-white/10 bg-[#0b1634]/80 p-8 text-center">
          <h1 className="font-display text-3xl text-white">Live batch not found</h1>
          <Link href="/courses" className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white">
            Browse Courses
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main onContextMenu={(event) => event.preventDefault()} className={`${theaterMode ? "w-full max-w-none px-0 py-0" : "mx-auto w-[94%] max-w-7xl py-8"} text-slate-100`}>
      <section className={`${theaterMode ? "min-h-screen rounded-none border-0" : "rounded-[34px] border border-white/10"} overflow-hidden bg-[#071023] shadow-[0_28px_90px_rgba(2,6,23,0.45)]`}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#0b1634] px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-red-200">{liveEnabled ? "Live Class" : "Live Offline"}</p>
            <h1 className="mt-1 truncate font-display text-2xl text-white md:text-3xl">{course.liveClassTitle || course.title}</h1>
            <p className="mt-1 text-sm text-slate-300">{course.title} | {course.batchTime || course.startDate || "Schedule will be updated"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPlayerKey((value) => value + 1)} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:border-orange-300/50">
              Refresh
            </button>
            <button type="button" onClick={() => setTheaterMode((value) => !value)} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:border-orange-300/50">
              {theaterMode ? "Exit Theater" : "Theater Mode"}
            </button>
            <Link href={`/courses/${encodeURIComponent(routeId || batchId)}`} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400">
              Batch Details
            </Link>
          </div>
        </div>

        <div className={`${theaterMode ? "p-0" : "grid gap-0 xl:grid-cols-[minmax(0,1fr)_400px]"}`}>
          <div className="overflow-hidden bg-black">
            {canWatch ? (
              canUseYouTubePlayer(liveUrl) ? (
                <LiveStatusChecker sourceUrl={liveUrl}>
                  {({ status, loading, refresh }) => (
                    <SecureYouTubePlayer
                      sourceUrl={liveUrl}
                      title={course.liveClassTitle || `${course.title} Live Class`}
                      liveStatus={status}
                      loading={loading}
                      playerKey={playerKey}
                      onRefresh={() => {
                        setPlayerKey((value) => value + 1);
                        refresh();
                      }}
                      recordedFallbackUrl={recordedFallbackUrl}
                      className={`${theaterMode ? "h-screen" : "aspect-video h-auto"} w-full bg-black`}
                      fallbackClassName={theaterMode ? "h-screen" : "aspect-video"}
                    />
                  )}
                </LiveStatusChecker>
              ) : (
                <div className={`${theaterMode ? "h-screen" : "aspect-video"} flex items-center justify-center bg-[#050816] p-6 text-center`}>
                  <div className="max-w-xl">
                    <p className="text-sm uppercase tracking-[0.28em] text-orange-300">Unsupported Live Source</p>
                    <h2 className="mt-3 font-display text-3xl text-white">Secure player ke liye YouTube live URL required hai.</h2>
                    <p className="mt-3 text-sm text-slate-300">Admin panel me YouTube video, channel live, ya embed live_stream URL save karein.</p>
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
                      <button type="button" onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/live/${batchId}`)}`)} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white">
                        Login
                      </button>
                    ) : null}
                    <Link href={`/checkout?course=${encodeURIComponent(routeId || batchId)}`} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white">
                      Enroll Batch
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!theaterMode ? (
            <aside className="min-h-[560px] border-l border-white/10 bg-[#0d1526]">
              {canWatch ? (
                <LiveClassChat batchId={routeId || batchId} title={course.liveClassTitle || course.title} />
              ) : (
                <div className="space-y-4 p-5">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Status</p>
                    <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${liveEnabled ? "bg-red-500/20 text-red-100" : "bg-white/10 text-slate-300"}`}>
                      {liveEnabled ? "LIVE ON" : "LIVE OFF"}
                    </div>
                    <p className="mt-3 text-sm text-slate-300">Live stream website ke andar secure player mein chalegi. Direct YouTube link UI mein share nahi hota.</p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Batch</p>
                    <img src={resolveCourseImage(course)} alt={course.title} className="mt-3 h-36 w-full rounded-2xl object-cover" />
                    <h3 className="mt-3 text-lg font-semibold text-white">{course.title}</h3>
                    <p className="mt-1 text-sm text-slate-300">Instructor: {course.instructor?.name || course.instructor || "BadamClasses"}</p>
                    <p className="mt-1 text-sm text-slate-300">Schedule: {course.batchTime || course.startDate || "Will be updated"}</p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                    <p className="font-semibold text-white">Class protection</p>
                    <p className="mt-2">Only logged-in enrolled students and admins can open this page.</p>
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
