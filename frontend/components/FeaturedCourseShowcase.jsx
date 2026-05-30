"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const AUTO_ADVANCE_MS = 4000;
const formatPrice = (value) => Number(value || 0).toLocaleString("en-IN");

export default function FeaturedCourseShowcase({ batches = [] }) {
  const items = useMemo(() => (Array.isArray(batches) ? batches.slice(0, 5) : []), [batches]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!items.length) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((current) => (current >= items.length ? 0 : current));
  }, [items.length]);

  useEffect(() => {
    if (paused || items.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(intervalId);
  }, [items.length, paused]);

  if (!items.length) {
    return null;
  }

  const activeItem = items[activeIndex];

  return (
    <section
      className="animate-reveal mb-12 overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.14),transparent_22%),radial-gradient(circle_at_right,rgba(56,189,248,0.12),transparent_24%),linear-gradient(160deg,#081227_0%,#0d1734_44%,#0a1224_100%)] p-5 shadow-[0_24px_80px_rgba(2,8,23,0.42)] md:p-7"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-orange-300">Featured Course Cinema Wall</p>
          <h2 className="mt-2 font-display text-3xl text-white md:text-4xl">Premium Course Spotlight</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
          {paused ? "Paused on hover" : "Auto changing every 4 sec"}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-black/20">
          <div className="absolute inset-0">
            <img
              key={`${activeItem.id}-bg`}
              src={activeItem.image}
              alt={activeItem.title}
              onError={(event) => {
                event.currentTarget.onerror = null;
                if (activeItem.fallbackImage) event.currentTarget.src = activeItem.fallbackImage;
              }}
              className="h-full w-full object-cover opacity-45 blur-[4px] transition duration-500"
            />
            <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(3,7,18,0.92)_0%,rgba(3,7,18,0.68)_38%,rgba(15,23,42,0.34)_100%)]" />
          </div>

          <div className="relative z-10 grid min-h-[560px] gap-6 p-5 lg:grid-cols-[1.1fr_0.9fr] lg:p-7">
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-orange-300/35 bg-orange-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-100">
                    Featured Course
                  </span>
                  <span className="live-badge !static !ml-0 bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.55)]">
                    LIVE
                  </span>
                </div>

                <h3 className="mt-5 max-w-[14ch] font-display text-4xl leading-[0.95] text-white md:text-5xl">
                  {activeItem.title}
                </h3>

                <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-200">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{activeItem.teacher}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{activeItem.validity}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{activeItem.mode}</span>
                </div>

                <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300">
                  {activeItem.description}
                </p>

                <div className="mt-6 flex flex-wrap items-end gap-3">
                  <p className="text-3xl font-semibold text-orange-300">
                    <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
                    {formatPrice(activeItem.price)}
                  </p>
                  {activeItem.oldPrice ? (
                    <p className="text-base text-slate-500 line-through">
                      <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
                      {formatPrice(activeItem.oldPrice)}
                    </p>
                  ) : null}
                  {activeItem.discount ? (
                    <span className="rounded-full border border-yellow-300/25 bg-yellow-400/12 px-3 py-1 text-xs font-semibold text-yellow-200">
                      {activeItem.discount}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/checkout?course=${encodeURIComponent(activeItem.courseKey)}`}
                  className="btn-gradient btn-anim rounded-xl px-5 py-3 text-sm font-semibold text-white"
                >
                  Purchase Now
                </Link>
                <Link
                  href={`/courses/${encodeURIComponent(activeItem.courseKey)}`}
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-300/45 hover:bg-white/10"
                >
                  View Details
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div className="relative overflow-hidden rounded-[28px] border border-yellow-300/35 bg-[#101828]/60 p-3 shadow-[0_20px_50px_rgba(2,8,23,0.45)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_42%)]" />
                <img
                  key={`${activeItem.id}-hero`}
                  src={activeItem.image}
                  alt={activeItem.title}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    if (activeItem.fallbackImage) event.currentTarget.src = activeItem.fallbackImage;
                  }}
                  className="relative z-10 aspect-[4/4.3] w-full rounded-[22px] object-cover shadow-[0_24px_40px_rgba(2,8,23,0.5)] transition duration-500 group-hover:scale-[1.02]"
                />
              </div>

              <div className="mt-4 grid grid-cols-4 gap-3">
                {items.map((item, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`overflow-hidden rounded-2xl border p-1 transition ${
                        isActive
                          ? "border-yellow-300 bg-yellow-300/10 shadow-[0_0_0_1px_rgba(253,224,71,0.35)]"
                          : "border-white/10 bg-white/5 hover:border-orange-300/35"
                      }`}
                      aria-label={`Show ${item.title}`}
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          if (item.fallbackImage) event.currentTarget.src = item.fallbackImage;
                        }}
                        className="aspect-square w-full rounded-xl object-cover"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </article>

        <div className="grid gap-4">
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={`${item.id}-summary`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`rounded-[26px] border p-4 text-left transition ${
                  isActive
                    ? "border-orange-300/45 bg-orange-500/10 shadow-[0_18px_40px_rgba(249,115,22,0.12)]"
                    : "border-white/10 bg-white/5 hover:border-orange-300/25"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-orange-200">{item.badge}</p>
                    <h4 className="mt-2 font-display text-xl text-white">{item.title}</h4>
                    <p className="mt-2 text-sm text-slate-300">{item.teacher}</p>
                  </div>
                  {isActive ? (
                    <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_0_14px_rgba(239,68,68,0.5)]">
                      Live
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{item.validity}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{item.mode}</span>
                  {item.discount ? (
                    <span className="rounded-full border border-yellow-300/20 bg-yellow-400/10 px-2.5 py-1 text-yellow-200">
                      {item.discount}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
