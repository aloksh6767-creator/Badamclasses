"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCourseFallbackImage, resolveCourseImage } from "@/lib/courseImages";
import {
  applySliderConfig,
  getLiveCountdown,
  getSliderConfig,
  isBatchLiveNow,
  makeBatchKey,
  pruneExpiredLiveNow
} from "@/lib/sliderConfig";

const AUTO_SLIDE_MS = 4000;

const formatPrice = (value) => Number(value || 0).toLocaleString("en-IN");

export default function BatchSlider({ batches = [] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [liveNowSet, setLiveNowSet] = useState(new Set());
  const [autoConfig, setAutoConfig] = useState(null);
  const [ordered, setOrdered] = useState(() => applySliderConfig(batches, null));

  useEffect(() => {
    setOrdered(applySliderConfig(batches, null));
  }, [batches]);

  useEffect(() => {
    let config = getSliderConfig();
    const pruned = pruneExpiredLiveNow(config);
    if (pruned !== config) {
      config = pruned;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("badamclasses_slider_config", JSON.stringify(pruned));
      }
    }
    setLiveNowSet(new Set(config.liveNow || []));
    setAutoConfig(config);
    setOrdered(applySliderConfig(batches, config));
  }, [batches]);

  useEffect(() => {
    if (!ordered.length) {
      setIndex(0);
      return;
    }
    setIndex((prev) => (prev >= ordered.length ? 0 : prev));
  }, [ordered.length]);

  useEffect(() => {
    if (!ordered.length || paused) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % ordered.length);
    }, AUTO_SLIDE_MS);

    return () => window.clearInterval(id);
  }, [ordered.length, paused]);

  useEffect(() => {
    if (!ordered.length) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") {
        setIndex((prev) => (prev - 1 + ordered.length) % ordered.length);
      }
      if (event.key === "ArrowRight") {
        setIndex((prev) => (prev + 1) % ordered.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ordered.length]);

  if (!ordered.length) return null;

  const active = ordered[index];
  const visibleThumbs = ordered.slice(0, 6);
  const visibleCards = ordered.slice(0, 4);
  const isLiveNow = autoConfig ? isBatchLiveNow(active, autoConfig) : liveNowSet.has(makeBatchKey(active));
  const countdown = autoConfig ? getLiveCountdown(active, autoConfig) : null;
  const routeKey = active.routeId || active._id || active.id || active.title;
  const effectivePrice = Number(active.offerPrice || active.priceValue || 0);
  const originalPrice = Number(active.priceValue || effectivePrice || 0);
  const discountLabel =
    active.offerLabel ||
    (active.discountPercent ? `${active.discountPercent}% OFF` : originalPrice > effectivePrice ? "Limited Offer" : "");
  const slideNumber = String(index + 1).padStart(2, "0");
  const totalSlides = String(ordered.length).padStart(2, "0");

  const handleTouchStart = (event) => {
    setTouchStartX(event.touches?.[0]?.clientX ?? null);
  };

  const handleTouchEnd = (event) => {
    if (touchStartX === null) return;
    const endX = event.changedTouches?.[0]?.clientX ?? null;
    if (endX === null) return;
    const delta = endX - touchStartX;
    if (Math.abs(delta) >= 40) {
      if (delta > 0) {
        setIndex((prev) => (prev - 1 + ordered.length) % ordered.length);
      } else {
        setIndex((prev) => (prev + 1) % ordered.length);
      }
    }
    setTouchStartX(null);
  };

  return (
    <section
      className="animate-reveal mb-10 overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_28%),linear-gradient(155deg,#081225_0%,#0d1735_50%,#0a1430_100%)] p-4 shadow-[0_24px_80px_rgba(2,8,23,0.42)] md:p-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-orange-300">
            {active.isLatest ? "Latest Batch" : "Featured Auto Slider"}
          </p>
          <h2 className="mt-2 font-display text-3xl text-white md:text-4xl">Premium Batch Spotlight</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
          {paused ? "Paused on hover" : "Auto changing every 4 sec"}
        </div>
      </div>

      <div key={makeBatchKey(active)} className="fade-swap grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <article className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
          <div className="absolute inset-0">
            <img
              src={resolveCourseImage(active)}
              alt={active.title}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = getCourseFallbackImage(active);
              }}
              className="h-full w-full object-cover opacity-30 blur-[6px]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,0.94)_0%,rgba(8,15,38,0.82)_38%,rgba(15,23,42,0.45)_100%)]" />
          </div>

          <div className="relative z-10 grid gap-6 p-4 md:p-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-stretch">
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#101828]/60 p-3 shadow-[0_20px_50px_rgba(2,8,23,0.45)]">
              <img
                src={resolveCourseImage(active)}
                alt={active.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getCourseFallbackImage(active);
                }}
                className="cinematic-zoom aspect-[4/4.6] w-full rounded-[18px] object-cover shadow-[0_24px_40px_rgba(2,8,23,0.5)] transition duration-500 group-hover:scale-[1.02]"
              />
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-full border border-orange-300/35 bg-orange-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-100">
                    Premium Batch
                  </span>
                  {isLiveNow ? (
                    <span className="live-badge !static !ml-0 bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.55)]">
                      LIVE
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                      {active.type === "recorded" ? "Recorded + Notes" : "Live + Recorded"}
                    </span>
                  )}
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                    {slideNumber}/{totalSlides}
                  </span>
                </div>

                <h3 className="mt-4 max-w-3xl font-display text-4xl leading-[0.98] text-white md:text-5xl">
                  {active.title}
                </h3>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                  Structured preparation with premium access, focused faculty support, and a cleaner path from batch discovery to checkout.
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-200">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Teacher: {active.instructor}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Validity: {active.duration}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Category: {active.category || "General"}</span>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  {active.batchTime ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Batch Time: {active.batchTime}</span>
                  ) : null}
                  {active.startDate ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Starts: {active.startDate}</span>
                  ) : null}
                  {countdown ? (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-200">Live ends in {countdown.label}</span>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-wrap items-end gap-3">
                  <p className="text-3xl font-semibold text-orange-300 md:text-4xl">
                    <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
                    {formatPrice(effectivePrice)}
                  </p>
                  {originalPrice > effectivePrice ? (
                    <p className="text-base text-slate-500 line-through">
                      <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
                      {formatPrice(originalPrice)}
                    </p>
                  ) : null}
                  {discountLabel ? (
                    <span className="rounded-full border border-yellow-300/20 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-200">
                      {discountLabel}
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Category</p>
                    <p className="mt-2 text-sm font-semibold text-white">{active.category || "General"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Access</p>
                    <p className="mt-2 text-sm font-semibold text-white">{isLiveNow ? "Live Now" : "Premium Access"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Savings</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {originalPrice > effectivePrice ? `${formatPrice(originalPrice - effectivePrice)} saved` : "Best price active"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    key={`${makeBatchKey(active)}-progress`}
                    className="h-full w-full rounded-full bg-orange-400"
                    style={{
                      animation: paused ? "none" : `sliderProgress ${AUTO_SLIDE_MS}ms linear`
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/checkout?course=${encodeURIComponent(active.title)}`}
                    className="btn-gradient btn-anim rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(249,115,22,0.28)]"
                  >
                    Purchase Now
                  </Link>
                  <Link
                    href={`/courses/${encodeURIComponent(routeKey)}`}
                    className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-300/45 hover:bg-white/10"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </article>

        <div className="grid gap-4">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-orange-200">Quick Switch</p>
                <p className="mt-1 text-sm text-slate-300">Jump between highlighted batches</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIndex((prev) => (prev - 1 + ordered.length) % ordered.length)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:border-orange-300/35"
                  aria-label="Previous slide"
                >
                  {"<"}
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((prev) => (prev + 1) % ordered.length)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:border-orange-300/35"
                  aria-label="Next slide"
                >
                  {">"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {visibleThumbs.map((item, i) => {
                const isActive = i === index;
                return (
                  <button
                    key={`${makeBatchKey(item)}-thumb`}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`overflow-hidden rounded-2xl border p-1 transition ${
                      isActive
                        ? "border-orange-300 bg-orange-500/10 shadow-[0_0_0_1px_rgba(251,146,60,0.35)]"
                        : "border-white/10 bg-white/5 hover:border-orange-300/35"
                    }`}
                    aria-label={`Show ${item.title}`}
                  >
                    <img
                      src={resolveCourseImage(item)}
                      alt={item.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getCourseFallbackImage(item);
                      }}
                      className="aspect-[1/1] w-full rounded-xl object-cover"
                      loading="lazy"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            {visibleCards.map((item, i) => {
              const isActive = i === index;
              return (
                <button
                  key={`${makeBatchKey(item)}-summary`}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`rounded-[24px] border p-4 text-left transition ${
                    isActive
                      ? "border-orange-300/45 bg-[linear-gradient(135deg,rgba(249,115,22,0.16),rgba(255,255,255,0.05))] shadow-[0_18px_40px_rgba(249,115,22,0.12)]"
                      : "border-white/10 bg-white/5 hover:border-orange-300/25"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-orange-200">
                        {item.isLatest ? "Latest Batch" : item.category || "Featured"}
                      </p>
                      <h4 className="mt-2 font-display text-xl text-white">{item.title}</h4>
                      <p className="mt-2 text-sm text-slate-300">{item.instructor}</p>
                    </div>
                    {isActive ? (
                      <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_0_14px_rgba(239,68,68,0.5)]">
                        Active
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{item.duration}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                      <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
                      {formatPrice(Number(item.offerPrice || item.priceValue || 0))}
                    </span>
                    {item.discountPercent || item.offerLabel ? (
                      <span className="rounded-full border border-yellow-300/20 bg-yellow-400/10 px-2.5 py-1 text-yellow-200">
                        {item.offerLabel || `${item.discountPercent}% OFF`}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="mr-2 text-xs uppercase tracking-[0.2em] text-slate-400">Progress</span>
            <div className="flex gap-2">
              {visibleThumbs.map((item, i) => (
                <button
                  key={`${makeBatchKey(item)}-${i}`}
                  onClick={() => setIndex(i)}
                  className={`h-2.5 rounded-full transition ${i === index ? "w-10 bg-orange-400" : "w-6 bg-white/30 hover:bg-white/45"}`}
                  aria-label={`Go to ${item.title}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
