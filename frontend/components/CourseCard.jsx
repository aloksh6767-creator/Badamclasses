"use client";

import Link from "next/link";
import { useState } from "react";
import GlassCard from "./GlassCard";
import { apiFetch } from "@/lib/api";
import { buildCourseRouteId } from "@/lib/courseIdentity";
import { getCourseFallbackImage, resolveCourseImage } from "@/lib/courseImages";

const getInstructorName = (course) => course.instructor?.name || course.facultyName || course.instructor || "Badam Singh";

const getCourseMeta = (course) => ({
  type: course.courseType || (course.liveClassEnabled ? "Live + Recorded" : "Recorded"),
  startDate: course.startDate || "New batch",
  timing: course.classTiming || course.batchTime || course.schedule || "Flexible timing",
  duration: course.duration || (course.months ? `${course.months} Months` : "Flexible"),
  language: course.language || "Hindi + English",
  students: Number(course.studentCount || course.enrolledCount || course.ratingCount || 0)
});

export default function CourseCard({ course, purchased = false }) {
  const [notice, setNotice] = useState("");
  const routeId = course.routeId || buildCourseRouteId(course);
  const hasPurchased = purchased;
  const hasRecording = Boolean(course.recordedVideoUrl || course.videoSources?.length || course.videos?.length);

  const handleWishlist = async () => {
    setNotice("");
    try {
      await apiFetch(`/courses/${course._id || course.id || routeId}/wishlist`, { method: "POST" });
      setNotice("Added to wishlist");
    } catch (error) {
      setNotice(error.message || "Wishlist unavailable right now");
    }
  };

  const price = Number(course.price || course.priceValue || 0);
  const offerPrice = Number(course.offerPrice || 0);
  const hasOffer = offerPrice > 0 && offerPrice < price;
  const payablePrice = hasOffer ? offerPrice : price;
  const discountLabel = course.offerLabel || (course.discountPercent ? `${course.discountPercent}% OFF` : "");
  const detailsHref = `/courses/${encodeURIComponent(routeId)}?details=1`;
  const learningHref = `/learn/${encodeURIComponent(routeId)}`;
  const primaryHref = hasPurchased ? learningHref : detailsHref;
  const meta = getCourseMeta(course);
  const instructorName = getInstructorName(course);
  const highlights = Array.isArray(course.highlights) && course.highlights.length
    ? course.highlights.slice(0, 3)
    : ["Live classes", "PDF notes", "Mock tests"];

  return (
    <GlassCard className="group flex h-full flex-col overflow-hidden p-0 transition duration-300 hover:-translate-y-1 hover:border-orange-300/35 hover:shadow-[0_26px_70px_rgba(15,23,42,0.38)]">
      <Link href={primaryHref} className="relative flex h-64 w-full items-center justify-center overflow-hidden bg-slate-950/50 p-3 focus:outline-none focus:ring-2 focus:ring-orange-300/70">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.24),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.2),transparent_38%)] opacity-90" />
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
          {course.isLatest || hasOffer ? (
            <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg">
              {hasOffer ? discountLabel || "Offer" : "New Batch"}
            </span>
          ) : null}
          <span className="rounded-full border border-white/20 bg-slate-950/65 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-100">
            Premium
          </span>
        </div>
        {course.liveClassEnabled ? (
          <span className="absolute right-3 top-3 z-10 rounded-full border border-red-300/40 bg-red-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-red-100">
            LIVE NOW
          </span>
        ) : hasRecording ? (
          <span className="absolute right-3 top-3 z-10 rounded-full border border-emerald-300/40 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">
            Recorded Class
          </span>
        ) : null}
        <img
          src={resolveCourseImage(course)}
          alt={course.title}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = getCourseFallbackImage(course);
          }}
          className="relative z-[1] h-full w-full rounded-lg object-contain object-center drop-shadow-[0_20px_32px_rgba(15,23,42,0.32)]"
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="min-h-[4.8rem]">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-200">{course.subject || course.category || "General"}</p>
          <Link href={primaryHref} className="mt-1 block font-display text-xl leading-snug text-text transition hover:text-orange-200">
            {course.title}
          </Link>
          {course.subtitle ? <p className="mt-1 line-clamp-2 text-sm text-slate-400">{course.subtitle}</p> : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">Faculty</span>
            <span className="mt-0.5 block truncate font-semibold text-slate-100">{instructorName}</span>
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
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-2xl font-black text-orange-200">{"\u20B9"}{payablePrice.toLocaleString("en-IN")}</span>
              {hasOffer ? <span className="text-xs text-slate-500 line-through">{"\u20B9"}{price.toLocaleString("en-IN")}</span> : null}
            </div>
          </div>
          <div className="text-right text-xs text-amber-200">
            <span className="block font-bold">{course.ratingAverage || 4.8}/5</span>
            <span className="text-slate-500">{meta.students ? `${meta.students}+ students` : "Top rated"}</span>
          </div>
        </div>

        <div className="mt-2 text-xs text-slate-400">
          Starts: <span className="font-semibold text-slate-200">{meta.startDate}</span>
          <span className="mx-2 text-slate-600">|</span>
          {meta.language}
        </div>

        {hasPurchased ? (
          <span className="mt-3 inline-flex w-fit rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
            Purchased
          </span>
        ) : null}
        {notice ? <p className="mt-2 text-xs text-orange-200">{notice}</p> : null}
        <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-4">
          <Link
            href={hasPurchased ? learningHref : `/checkout?course=${encodeURIComponent(routeId)}`}
            className={`btn-gradient btn-anim rounded-xl px-4 py-2.5 text-center text-sm font-bold text-white shadow-[0_14px_30px_rgba(249,115,22,0.22)] ${hasPurchased ? "from-emerald-500 to-cyan-500" : ""}`}
          >
            {hasPurchased ? "Start Learning" : "Enroll Now"}
          </Link>
          <Link href={detailsHref} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100">
            Details
          </Link>
          {hasPurchased && course.liveClassEnabled ? (
            <Link href={`/live/${encodeURIComponent(routeId)}`} className="rounded-xl border border-red-300/50 bg-red-500/10 px-4 py-2 text-center text-sm font-semibold text-red-100">
              Join Live
            </Link>
          ) : hasPurchased && hasRecording ? (
            <Link href={detailsHref} className="rounded-xl border border-emerald-300/50 bg-emerald-500/10 px-4 py-2 text-center text-sm font-semibold text-emerald-100">
              Watch Recording
            </Link>
          ) : null}
          <button onClick={handleWishlist} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200">
            Wishlist
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
