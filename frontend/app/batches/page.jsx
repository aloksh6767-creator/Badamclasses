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
        {visibleBatches.map((batch, index) => (
          <article
            key={`${makeBatchKey(batch, index)}-${index}`}
            className="card-anim overflow-hidden rounded-2xl border border-white/10 bg-[#0d1a3a]/70"
          >
            <img src={resolveCourseImage(batch)} alt={batch.title} className="aspect-[29/36] w-full object-cover" />
            <div className="p-5">
              <h2 className="font-display text-2xl">{batch.title}</h2>
              <p className="text-sm text-slate-300">Instructor: {batch.instructor?.name || batch.instructor || "BadamClasses"}</p>
              <p className="text-sm text-slate-300">Duration: {batch.duration || "Flexible"}</p>
              <p className="mt-2 text-lg text-orange-300">₹{Number(batch.priceValue || batch.price || 0).toLocaleString("en-IN")}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
                {(Array.isArray(batch.highlights) && batch.highlights.length ? batch.highlights : ["Live + recorded classes", "PDF notes", "Guided learning path"]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link
                href={`/checkout?course=${encodeURIComponent(batch.routeId || batch._id || batch.id || batch.title)}`}
                className="btn-gradient btn-anim mt-4 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white"
              >
                Enroll Now
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
