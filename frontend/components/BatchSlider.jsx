"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCourseFallbackImage, resolveCourseImage } from "@/lib/courseImages";
import { applySliderConfig, getSliderConfig, makeBatchKey, pruneExpiredLiveNow } from "@/lib/sliderConfig";

const AUTO_SLIDE_MS = 4200;

const formatPrice = (value) => Number(value || 0).toLocaleString("en-IN");

const trustStats = [
  { value: "50K+", label: "Students" },
  { value: "500+", label: "Classes" },
  { value: "10K+", label: "Tests" }
];

const subjectTags = ["Maths", "Reasoning", "English", "GS", "Current Affairs"];

const featureCards = [
  { title: "Live + Recorded", text: "Daily classes with replay access" },
  { title: "Notes + PDFs", text: "Bilingual study material" },
  { title: "Mock Tests", text: "Practice with performance tracking" }
];

export default function BatchSlider({ batches = [] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [ordered, setOrdered] = useState(() => applySliderConfig(batches, null));

  useEffect(() => {
    let config = getSliderConfig();
    const pruned = pruneExpiredLiveNow(config);
    if (pruned !== config && typeof window !== "undefined") {
      window.localStorage.setItem("badamclasses_slider_config", JSON.stringify(pruned));
      config = pruned;
    }
    setOrdered(applySliderConfig(batches, config));
  }, [batches]);

  useEffect(() => {
    if (!ordered.length) {
      setIndex(0);
      return;
    }
    setIndex((current) => (current >= ordered.length ? 0 : current));
  }, [ordered.length]);

  useEffect(() => {
    if (!ordered.length || paused) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % ordered.length);
    }, AUTO_SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [ordered.length, paused]);

  if (!ordered.length) return null;

  const active = ordered[index];
  const routeKey = active.routeId || active.routeSlug || active.slug || active._id || active.id || active.title;
  const effectivePrice = Number(active.offerPrice || active.priceValue || active.price || 0);
  const originalPrice = Number(active.priceValue || active.price || effectivePrice || 0);
  const visibleThumbs = ordered.slice(0, 6);

  const moveSlide = (direction) => {
    setIndex((current) => (current + direction + ordered.length) % ordered.length);
  };

  const handleTouchStart = (event) => {
    setTouchStartX(event.touches?.[0]?.clientX ?? null);
  };

  const handleTouchEnd = (event) => {
    if (touchStartX === null) return;
    const endX = event.changedTouches?.[0]?.clientX ?? null;
    if (endX === null) return;
    const delta = endX - touchStartX;
    if (Math.abs(delta) >= 40) {
      moveSlide(delta > 0 ? -1 : 1);
    }
    setTouchStartX(null);
  };

  return (
    <section
      className="animate-reveal mb-10 overflow-hidden rounded-[28px] border border-orange-200/25 bg-[radial-gradient(circle_at_top_left,rgba(255,122,0,0.2),transparent_28%),linear-gradient(145deg,#071126_0%,#0a1a3a_48%,#10265a_100%)] p-3 shadow-[0_24px_70px_rgba(0,26,84,0.34)] md:p-5"
      aria-label="Course banner slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <img
              src="/new-logo.png"
              alt="Badam Singh Classes"
              className="h-12 w-20 rounded-xl border border-orange-300/30 object-cover shadow-[0_12px_24px_rgba(2,8,23,0.28)]"
            />
            <span className="rounded-full border border-orange-300/35 bg-orange-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-100">
              New Test Series Starting Today
            </span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">
            {active.isLatest ? "Latest Course" : "Course Banner"}
          </p>
          <h2 className="mt-2 max-w-3xl font-display text-3xl font-semibold leading-tight text-white md:text-5xl">
            Learn Smarter. Succeed Faster.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
            Slide karke latest course banner dekho, details explore karo, aur checkout se direct enrollment start karo.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {subjectTags.map((tag) => (
              <span key={tag} className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-semibold text-slate-100">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:min-w-[300px]">
          {trustStats.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/12 bg-white/8 p-3 text-center">
              <p className="text-lg font-bold text-white">{item.value}</p>
              <p className="mt-1 text-[11px] text-slate-300">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1 md:px-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl font-semibold text-white md:text-2xl">
            {active.title}
          </h3>
          <p className="mt-1 text-xs text-slate-300">Swipe or use arrows to change course banner.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => moveSlide(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/8 text-lg font-semibold text-white transition hover:border-orange-300/50"
            aria-label="Previous course banner"
          >
            {"<"}
          </button>
          <button
            type="button"
            onClick={() => moveSlide(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/8 text-lg font-semibold text-white transition hover:border-orange-300/50"
            aria-label="Next course banner"
          >
            {">"}
          </button>
        </div>
      </div>

      <article key={makeBatchKey(active)} className="fade-swap">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[24px] border border-white/25 bg-[#0a1734]">
          <img
            src={resolveCourseImage(active)}
            alt={active.title}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = getCourseFallbackImage(active);
            }}
            className="block aspect-[16/9] w-full object-cover"
            loading={index === 0 ? "eager" : "lazy"}
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061027]/95 via-[#061027]/58 to-transparent px-4 pb-4 pt-16 md:px-6 md:pb-6">
            <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
              <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-100">
                <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1">
                  {active.category || "General"}
                </span>
                <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1">
                  {active.duration || "Flexible access"}
                </span>
                <span className="rounded-full border border-orange-300/30 bg-orange-500/20 px-3 py-1 font-semibold text-orange-100">
                  <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
                  {formatPrice(effectivePrice)}
                </span>
                {originalPrice > effectivePrice ? (
                  <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-slate-300 line-through">
                    <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
                    {formatPrice(originalPrice)}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href={`/checkout?course=${encodeURIComponent(active.title)}`}
                  className="btn-gradient btn-anim rounded-xl px-6 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(249,115,22,0.32)]"
                >
                  Buy Now
                </Link>
                <Link
                  href={`/courses/${encodeURIComponent(routeKey)}`}
                  className="btn-anim rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:border-orange-300/55 hover:bg-white/15"
                >
                  Explore Course
                </Link>
              </div>
            </div>
          </div>

          <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {String(index + 1).padStart(2, "0")} / {String(ordered.length).padStart(2, "0")}
          </div>
        </div>
      </article>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {featureCards.map((feature) => (
          <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-sm font-semibold text-white">{feature.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">{feature.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {visibleThumbs.map((item, itemIndex) => {
          const isActive = itemIndex === index;
          return (
            <button
              key={`${makeBatchKey(item)}-thumb`}
              type="button"
              onClick={() => setIndex(itemIndex)}
              className={`overflow-hidden rounded-xl border p-1 transition ${
                isActive
                  ? "border-orange-300 bg-orange-500/15"
                  : "border-white/10 bg-white/5 hover:border-orange-300/35"
              }`}
              aria-label={`Show ${item.title}`}
            >
              <img
                src={resolveCourseImage(item)}
                alt={item.title}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = getCourseFallbackImage(item);
                }}
                className="aspect-[16/9] w-full rounded-lg object-cover"
                loading="lazy"
              />
            </button>
          );
        })}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          key={`${makeBatchKey(active)}-progress`}
          className="h-full rounded-full bg-orange-400"
          style={{ animation: paused ? "none" : `sliderProgress ${AUTO_SLIDE_MS}ms linear` }}
        />
      </div>
    </section>
  );
}
