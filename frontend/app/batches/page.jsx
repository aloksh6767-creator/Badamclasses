"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { resolveCourseImage } from "@/lib/courseImages";
import { buildCourseRouteId, normalizeCourseForRoute } from "@/lib/courseIdentity";
import { batches } from "@/lib/fixtures";
import { filterDeletedCourses, filterDeletedCoursesFromStorage, readDeletedCourseKeys, readLocalCourses } from "@/lib/localCourseState";

const makeBatchKey = (course, index = 0) => buildCourseRouteId(course, index);

const dedupeBatches = (items = []) => {
  const seen = new Set();
  return items.filter((item, index) => {
    const key = `${makeBatchKey(item, index)}::${String(item?.title || "").trim().toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const normalizeFixtureBatch = (batch, index) =>
  normalizeCourseForRoute(
    {
      _id: batch.id,
      id: batch.id,
      title: batch.title,
      instructor: batch.instructor,
      price: batch.priceValue,
      image: batch.image,
      thumbnail: batch.image,
      duration: batch.duration,
      category: batch.category,
      batchTime: batch.batchTime,
      startDate: batch.startDate,
      liveClassEnabled: batch.liveClassEnabled,
      liveClassUrl: batch.liveClassUrl,
      highlights: batch.highlights
    },
    index
  );

const getInstructorName = (batch) => batch.instructor?.name || batch.facultyName || batch.instructor || "BadamClasses";

const getBatchMeta = (batch) => ({
  type: batch.courseType || (batch.liveClassEnabled ? "Live + Recorded" : "Recorded"),
  timing: batch.classTiming || batch.batchTime || "Flexible timing",
  startDate: batch.startDate || "New batch",
  duration: batch.duration || "Flexible",
  rating: Number(batch.ratingAverage || 4.8)
});

export default function BatchesPage() {
  const [deletedCourseKeys, setDeletedCourseKeys] = useState([]);
  const fallbackBatches = useMemo(() => filterDeletedCourses(batches, deletedCourseKeys).map(normalizeFixtureBatch), [deletedCourseKeys]);
  const [visibleBatches, setVisibleBatches] = useState(fallbackBatches);
  const [error, setError] = useState("");

  useEffect(() => {
    setDeletedCourseKeys(readDeletedCourseKeys());
  }, []);

  useEffect(() => {
    const loadBatches = async () => {
      const localBatches = filterDeletedCoursesFromStorage(readLocalCourses()).map((course, index) =>
        normalizeCourseForRoute(
          {
            _id: course._id,
            id: course.id,
            slug: course.slug,
            title: course.title,
            instructor: course.instructor || "BadamClasses",
            price: Number(course.offerPrice || course.price || 0),
            image: resolveCourseImage(course),
            thumbnail: resolveCourseImage(course),
            duration: course.duration || "Flexible",
            category: course.category || "",
            batchTime: course.batchTime || "",
            startDate: course.startDate || "",
            liveClassEnabled: Boolean(course.liveClassEnabled),
            liveClassUrl: course.liveClassUrl || "",
            highlights: Array.isArray(course.highlights) ? course.highlights : []
          },
          index
        )
      );

      setVisibleBatches(dedupeBatches([...localBatches, ...fallbackBatches]));

      try {
        const data = await apiFetch("/courses");
        const remoteBatches = Array.isArray(data) ? data.map((course, index) => normalizeCourseForRoute(course, index)) : [];
        setVisibleBatches(dedupeBatches([...localBatches, ...remoteBatches, ...fallbackBatches]));
      } catch (loadError) {
        setError("Live batches are unavailable. Showing available catalog.");
        setVisibleBatches(dedupeBatches([...localBatches, ...fallbackBatches]));
      }
    };

    loadBatches();
  }, [fallbackBatches]);

  return (
    <main className="mx-auto w-[92%] max-w-7xl py-10 text-slate-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">All Batches</h1>
          <p className="mt-2 text-sm text-slate-300">Choose a batch that matches your exam target and timeline.</p>
        </div>
        <Link href="/" className="rounded-lg border border-white/20 px-4 py-2 text-sm">
          Back to Home
        </Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-orange-300/40 bg-orange-500/10 p-3 text-sm text-orange-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleBatches.map((batch, index) => {
          const routeId = batch.routeId || batch._id || batch.id || batch.title;
          const meta = getBatchMeta(batch);
          const highlights = Array.isArray(batch.highlights) && batch.highlights.length
            ? batch.highlights.slice(0, 3)
            : ["Live + recorded classes", "PDF notes", "Guided learning path"];

          return (
          <article
            key={`${makeBatchKey(batch, index)}-${index}`}
            className="card-anim group overflow-hidden rounded-2xl border border-white/10 bg-[#0d1a3a]/80 shadow-[0_22px_55px_rgba(2,8,23,0.28)] transition duration-300 hover:-translate-y-1 hover:border-orange-300/35"
          >
            <Link href={`/courses/${encodeURIComponent(routeId)}?details=1`} className="relative flex aspect-[4/3.6] items-center justify-center overflow-hidden bg-slate-950/50 p-3">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.22),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.18),transparent_36%)]" />
              <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
                <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                  {batch.isLatest ? "New Batch" : "Premium"}
                </span>
                {batch.liveClassEnabled ? (
                  <span className="rounded-full border border-red-300/40 bg-red-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-red-100">
                    Live
                  </span>
                ) : null}
              </div>
              <img src={resolveCourseImage(batch)} alt={batch.title} className="relative z-[1] h-full w-full rounded-xl object-contain object-center drop-shadow-[0_18px_28px_rgba(15,23,42,0.36)]" />
            </Link>
            <div className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-200">{batch.category || "General"}</p>
              <Link href={`/courses/${encodeURIComponent(routeId)}?details=1`} className="mt-1 block font-display text-2xl leading-tight text-white transition hover:text-orange-200">
                {batch.title}
              </Link>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <span className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">Faculty</span>
                  <span className="mt-0.5 block truncate font-semibold text-slate-100">{getInstructorName(batch)}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <span className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">Timing</span>
                  <span className="mt-0.5 block truncate font-semibold text-slate-100">{meta.timing}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <span className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">Duration</span>
                  <span className="mt-0.5 block truncate font-semibold text-slate-100">{meta.duration}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                  <span className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">Mode</span>
                  <span className="mt-0.5 block truncate font-semibold text-slate-100">{meta.type}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {highlights.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-slate-950/25 px-2.5 py-1 text-[11px] text-slate-300">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Course Fee</p>
                  <p className="mt-1 text-2xl font-black text-orange-200">{"\u20B9"}{Number(batch.priceValue || batch.price || 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <span className="block font-bold text-amber-200">{meta.rating}/5</span>
                  <span>{meta.startDate}</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                <Link
                  href={`/checkout?course=${encodeURIComponent(routeId)}`}
                  className="btn-gradient btn-anim rounded-xl px-4 py-2.5 text-center text-sm font-bold text-white shadow-[0_14px_30px_rgba(249,115,22,0.22)]"
                >
                  Enroll Now
                </Link>
                <Link
                  href={`/courses/${encodeURIComponent(routeId)}?details=1`}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100"
                >
                  Details
                </Link>
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </main>
  );
}
