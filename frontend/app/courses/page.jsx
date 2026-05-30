"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CourseCard from "@/components/CourseCard";
import { apiFetch } from "@/lib/api";
import { resolveCourseImage } from "@/lib/courseImages";
import { buildCourseRouteId, normalizeCourseForRoute } from "@/lib/courseIdentity";
import { batches } from "@/lib/fixtures";
import { filterDeletedCourses, filterDeletedCoursesFromStorage, readDeletedCourseKeys, readLocalCourses } from "@/lib/localCourseState";
import { readLocalPurchases } from "@/lib/purchaseState";

const makeCourseKey = (course, index = 0) => buildCourseRouteId(course, index);

const isPlaceholderCourse = (course = {}) => {
  const description = String(course.description || "").trim().toLowerCase();
  return (
    !Number(course.price || course.priceValue || 0) ||
    !String(course.image || course.thumbnail || "").trim() ||
    !description ||
    description === "course details will be updated soon."
  );
};

const getMergeKey = (course = {}, index = 0) => {
  const title = String(course.title || "").trim().toLowerCase();
  const category = String(course.category || course.subject || "").trim().toLowerCase();
  if (title) return `title:${title}:${category}`;
  return `id:${makeCourseKey(course, index)}`;
};

const fillCourseGaps = (base = {}, next = {}) => {
  const basePrice = Number(base.price || base.priceValue || 0);
  const nextPrice = Number(next.price || next.priceValue || 0);
  const baseDescription = String(base.description || "").trim().toLowerCase();
  const nextDescription = String(next.description || "").trim();

  return {
    ...base,
    subtitle: base.subtitle || next.subtitle || "",
    description:
      !base.description || baseDescription === "course details will be updated soon."
        ? nextDescription || base.description
        : base.description,
    price: basePrice > 0 ? base.price : nextPrice > 0 ? next.price || next.priceValue : base.price,
    priceValue: basePrice > 0 ? base.priceValue : nextPrice > 0 ? next.priceValue || next.price : base.priceValue,
    offerPrice: Number(base.offerPrice || 0) > 0 ? base.offerPrice : next.offerPrice,
    image: base.image || next.image || next.thumbnail || "",
    thumbnail: base.thumbnail || next.thumbnail || next.image || "",
    duration: base.duration || next.duration || "",
    batchTime: base.batchTime || next.batchTime || "",
    startDate: base.startDate || next.startDate || "",
    liveClassEnabled: base.liveClassEnabled || next.liveClassEnabled,
    liveClassUrl: base.liveClassUrl || next.liveClassUrl || "",
    liveClassTitle: base.liveClassTitle || next.liveClassTitle || "",
    highlights: Array.isArray(base.highlights) && base.highlights.length ? base.highlights : next.highlights,
    classSections: Array.isArray(base.classSections) && base.classSections.length ? base.classSections : next.classSections,
    pdfResources: Array.isArray(base.pdfResources) && base.pdfResources.length ? base.pdfResources : next.pdfResources,
    recordedVideoUrl: base.recordedVideoUrl || next.recordedVideoUrl || "",
    videoSources: Array.isArray(base.videoSources) && base.videoSources.length ? base.videoSources : next.videoSources,
    ratingAverage: Number(base.ratingAverage || 0) > 0 ? base.ratingAverage : next.ratingAverage,
    ratingCount: Number(base.ratingCount || 0) > 0 ? base.ratingCount : next.ratingCount
  };
};

const dedupeCourses = (items = []) => {
  const merged = new Map();
  items.forEach((course, index) => {
    const normalized = normalizeCourseForRoute(course, index);
    const key = getMergeKey(normalized, index);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, normalized);
      return;
    }

    const shouldReplacePlaceholder = isPlaceholderCourse(existing) && !isPlaceholderCourse(normalized);
    merged.set(
      key,
      shouldReplacePlaceholder
        ? fillCourseGaps(normalized, existing)
        : fillCourseGaps(existing, normalized)
    );
  });
  return Array.from(merged.values());
};

export default function CoursesPage() {
  const [deletedCourseKeys, setDeletedCourseKeys] = useState([]);
  const fallbackCourses = useMemo(() => {
    const filtered = filterDeletedCourses(batches, deletedCourseKeys);
    const sourceBatches = filtered.length ? filtered : batches;
    return sourceBatches.map((batch, index) =>
      normalizeCourseForRoute({
        _id: batch.id,
        title: batch.title,
        subtitle: batch.subtitle || "",
        instructor: batch.instructor,
        price: batch.priceValue,
        subject: batch.subject || batch.category || "General",
        category: batch.category || batch.subject || "General",
        ratingAverage: 4.8,
        ratingCount: 240,
        image: batch.image,
        liveClassEnabled: batch.liveClassEnabled,
        liveClassUrl: batch.liveClassUrl
      }, index));
  }, [deletedCourseKeys]);
  const [courses, setCourses] = useState(fallbackCourses);
  const [purchasedKeys, setPurchasedKeys] = useState(new Set());
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getPurchaseKeys = (items = []) =>
    new Set(
      items
        .flatMap((item) => [
          item?.courseRouteId,
          item?.courseId,
          item?.id,
          item?.routeId,
          item?.title,
          item?.course?.routeId,
          item?.course?._id,
          item?.course?.id,
          item?.course?.title,
          item?.courseTitle
        ])
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
    );

  const isPurchased = (course = {}) => {
    const keys = [
      course.routeId,
      course._id,
      course.id,
      course.slug,
      course.title
    ].map((value) => String(value || "").trim().toLowerCase());
    return keys.some((key) => purchasedKeys.has(key));
  };

  const loadCourses = async (value = "") => {
    setLoading(true);
    setError("");
    const localCourses = filterDeletedCoursesFromStorage(readLocalCourses()).filter((course) => course.status !== "draft");
    const mappedLocal = localCourses.map((course, index) => normalizeCourseForRoute({
      _id: course._id,
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      instructor: course.instructor || "BadamClasses",
      price: Number(course.price || 0),
      offerPrice: Number(course.offerPrice || 0),
      subject: course.subject || course.category || "General",
      category: course.category || course.subject || "General",
      status: course.status || "active",
      classSections: course.classSections || [],
      pdfResources: course.pdfResources || [],
      recordedVideoUrl: course.recordedVideoUrl || "",
      videoSources: course.videoSources || [],
      liveClassUrl: course.liveClassUrl || "",
      liveClassEnabled: Boolean(course.liveClassEnabled),
      ratingAverage: 4.8,
      ratingCount: 240,
      image: resolveCourseImage(course)
    }, index));
    const filteredFallback = value
      ? fallbackCourses.filter((course) => course.title.toLowerCase().includes(value.toLowerCase()))
      : fallbackCourses;
    const safeFallback = filteredFallback.length ? filteredFallback : fallbackCourses;
    setCourses(dedupeCourses([...mappedLocal, ...safeFallback]));

    try {
      const query = value ? `?search=${encodeURIComponent(value)}` : "";
      const data = await apiFetch(`/courses${query}`);
      const normalizedRemote = Array.isArray(data)
        ? data.map((course, index) => normalizeCourseForRoute(course, index))
        : [];
      const merged = dedupeCourses([...mappedLocal, ...normalizedRemote, ...safeFallback]);
      console.debug("[courses] merged route ids", merged.map((course) => ({
        title: course.title,
        routeId: course.routeId
      })));
      setCourses(merged);
    } catch (err) {
      setError("Live courses are unavailable. Showing featured batches instead.");
      setCourses(dedupeCourses([...mappedLocal, ...safeFallback]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDeletedCourseKeys(readDeletedCourseKeys());
  }, []);

  useEffect(() => {
    loadCourses();
    const localKeys = getPurchaseKeys(readLocalPurchases());
    setPurchasedKeys(localKeys);

    apiFetch("/enrollments/my")
      .then((items) => {
        const remoteKeys = Array.isArray(items) ? getPurchaseKeys(items) : new Set();
        setPurchasedKeys(new Set([...localKeys, ...remoteKeys]));
      })
      .catch(() => {
        setPurchasedKeys(localKeys);
      });
  }, [fallbackCourses]);

  const subjects = useMemo(() => {
    const values = new Set(["all"]);
    courses.forEach((course) => values.add(course.subject || course.category || "General"));
    return Array.from(values).filter(Boolean);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      const subject = course.subject || course.category || "General";
      const matchesSearch = !query || [course.title, course.subtitle, course.description, subject]
        .some((value) => String(value || "").toLowerCase().includes(query));
      const matchesSubject = subjectFilter === "all" || subject === subjectFilter;
      const purchased = isPurchased(course);
      const matchesAccess =
        accessFilter === "all" ||
        (accessFilter === "purchased" && purchased) ||
        (accessFilter === "available" && !purchased);
      return matchesSearch && matchesSubject && matchesAccess;
    });
  }, [accessFilter, courses, purchasedKeys, search, subjectFilter]);

  return (
    <main className="mx-auto w-[92%] max-w-6xl py-10">
      <section className="mb-6 grid gap-4 rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h1 className="font-display text-4xl">All Courses</h1>
          <p className="mt-2 text-sm text-slate-300">Browse premium programs with videos, notes, and guided learning paths.</p>
        </div>
        <Link href="/" className="inline-flex rounded-xl border border-indigo-400/50 px-4 py-2 text-sm font-semibold text-indigo-200">
          Back To Front Page
        </Link>
      </section>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses"
            className="min-w-0 rounded-xl border border-white/10 bg-card px-4 py-2 text-sm outline-none"
          />
          <button onClick={() => loadCourses(search)} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white">
            Search
          </button>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-card px-4 py-2 text-sm outline-none"
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>{subject === "all" ? "All Subjects" : subject}</option>
            ))}
          </select>
          <select
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-card px-4 py-2 text-sm outline-none"
          >
            <option value="all">All Courses</option>
            <option value="available">Available to Buy</option>
            <option value="purchased">Purchased</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-orange-300/40 bg-orange-500/10 p-3 text-sm text-orange-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-slate-300">Loading courses...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {filteredCourses.map((course, index) => (
            <CourseCard key={`${makeCourseKey(course, index)}-${index}`} course={course} purchased={isPurchased(course)} />
          ))}
          {!filteredCourses.length ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300 md:col-span-3">
              No courses match the selected filters.
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
