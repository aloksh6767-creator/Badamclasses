"use client";

import Link from "next/link";
import { useState } from "react";
import GlassCard from "./GlassCard";
import { apiFetch } from "@/lib/api";
import { buildCourseRouteId } from "@/lib/courseIdentity";
import { getCourseFallbackImage, resolveCourseImage } from "@/lib/courseImages";

export default function CourseCard({ course, purchased = false }) {
  const [notice, setNotice] = useState("");
  const routeId = course.routeId || buildCourseRouteId(course);
  const hasPurchased = purchased;

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

  return (
    <GlassCard className="group flex h-full flex-col">
      <Link href={primaryHref} className="relative mb-4 flex h-72 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-950/40 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.28)] focus:outline-none focus:ring-2 focus:ring-orange-300/70">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.18),transparent_45%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.14),transparent_35%)] opacity-80" />
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
      <div className="min-h-[5.75rem]">
        <Link href={primaryHref} className="font-display text-xl leading-snug text-text transition hover:text-orange-200">
          {course.title}
        </Link>
        {course.subtitle ? <p className="mt-2 text-sm text-slate-400">{course.subtitle}</p> : null}
      </div>
      <p className="mt-1 text-sm text-slate-300">Instructor: {course.instructor?.name || course.instructor || "BadamSingh"}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{course.subject || course.category || "General"}</p>
      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-indigo-300">Rs {payablePrice.toLocaleString("en-IN")}</span>
        <span className="text-amber-300">Star {course.ratingAverage || 0} ({course.ratingCount || 0})</span>
      </div>
      {hasOffer ? (
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-300">
          <span className="line-through text-slate-400">Rs {price.toLocaleString("en-IN")}</span>
          <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[11px] text-orange-200">
            {discountLabel || "Special Offer"}
          </span>
        </div>
      ) : null}
      {hasPurchased ? (
        <span className="mt-3 inline-flex w-fit rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
          Purchased
        </span>
      ) : null}
      {notice ? <p className="mt-2 text-xs text-orange-200">{notice}</p> : null}
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {hasPurchased && course.liveClassEnabled ? (
          <Link href={`/live/${encodeURIComponent(routeId)}`} className="rounded-lg border border-red-300/50 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100">
            Join Live
          </Link>
        ) : null}
        <Link href={detailsHref} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">
          View Details
        </Link>
        <Link
          href={hasPurchased ? learningHref : `/checkout?course=${encodeURIComponent(routeId)}`}
          className={`rounded-lg border px-4 py-2 text-sm ${hasPurchased ? "border-emerald-300/50 text-emerald-200" : "border-orange-300/50 text-orange-200"}`}
        >
          {hasPurchased ? "Start Learning" : "Buy Now"}
        </Link>
        <button onClick={handleWishlist} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200">
          Wishlist
        </button>
      </div>
    </GlassCard>
  );
}
