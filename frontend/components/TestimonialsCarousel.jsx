"use client";

import { useEffect, useMemo, useState } from "react";

function LaurelWreathIcon({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6.436 8A8.6 8.6 0 0 0 6 10.727C6 14.744 8.686 18 12 18s6-3.256 6-7.273A8.6 8.6 0 0 0 17.564 8" />
      <path d="M14.5 21s-.682-3-2.5-3-2.5 3-2.5 3" />
      <path d="M18.52 5.23C18.812 6.896 17.5 8 17.5 8s-1.603-.563-1.895-2.23C15.313 4.104 16.625 3 16.625 3s1.603.563 1.895 2.23" />
      <path d="M21.094 12.14c-1.281 1.266-3.016.76-3.016.76s-.454-1.772.828-3.04c1.28-1.266 3.016-.76 3.016-.76s.454 1.772-.828 3.04" />
      <path d="M17.734 18.826C16.234 18.251 16 16.636 16 16.636s1.267-1.038 2.767-.462c1.5.575 1.733 2.19 1.733 2.19s-1.267 1.038-2.767.462" />
      <path d="M6.267 18.826C7.767 18.251 8 16.636 8 16.636s-1.267-1.038-2.767-.462c-1.5.575-1.733 2.19-1.733 2.19s1.267 1.038 2.767.462" />
      <path d="M2.906 12.14c1.281 1.266 3.016.76 3.016.76s.454-1.772-.828-3.04c-1.281-1.265-3.016-.76-3.016-.76s-.454 1.772.828 3.04" />
      <path d="M5.48 5.23C5.188 6.896 6.5 8 6.5 8s1.603-.563 1.895-2.23C8.687 4.104 7.375 3 7.375 3S5.772 3.563 5.48 5.23" />
    </svg>
  );
}
export default function TestimonialsCarousel({ items = [] }) {
  const groups = useMemo(() => {
    const result = [];
    for (let index = 0; index < items.length; index += 3) {
      result.push(items.slice(index, index + 3));
    }
    return result;
  }, [items]);
  const [activeGroup, setActiveGroup] = useState(0);

  useEffect(() => {
    setActiveGroup(0);
  }, [groups.length]);

  useEffect(() => {
    if (groups.length < 2) return undefined;

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        setActiveGroup((current) => (current + 1) % groups.length);
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [groups.length]);

  const visibleItems = groups[activeGroup] || groups[0];

  if (!items.length) return null;

  return (
    <section id="results" className="animate-reveal stagger-2 mb-14">
      <div className="mb-8 px-2 text-center">
        <div className="flex items-center justify-center gap-3 sm:gap-5">
          <LaurelWreathIcon className="hidden h-10 w-10 shrink-0 text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.3)] sm:block md:h-12 md:w-12" />
          <h2 className="border-b border-orange-300/30 pb-3 font-display text-3xl font-bold leading-tight tracking-tight text-white [text-shadow:0_3px_18px_rgba(0,0,0,0.45)] sm:text-4xl md:text-5xl lg:text-6xl">
            Student <span className="text-orange-400">Success Stories</span>
          </h2>
          <LaurelWreathIcon className="hidden h-10 w-10 shrink-0 text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.3)] sm:block md:h-12 md:w-12" />
        </div>
        <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <p className="text-sm font-medium text-slate-300 sm:text-base">हमारे विद्यार्थियों की मेहनत और सफलता</p>
          <span className="inline-flex rounded-full border border-orange-300/35 bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-200">
            500+ Selections
          </span>
        </div>
      </div>
      <div key={`success-group-${activeGroup}`} className="success-group-transition grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => (
          <a
            key={item.name}
            href={item.image}
            target="_blank"
            rel="noreferrer"
            className="card-anim group snap-start overflow-hidden rounded-2xl border border-white/10 bg-[#0d1a3a]/70 transition hover:-translate-y-1 hover:border-orange-300/40"
            aria-label={`View ${item.name}'s success poster`}
          >
            <div className="aspect-[4/5] overflow-hidden bg-[#f8f5ef]">
              <img
                src={item.image}
                alt={`${item.name} - ${item.exam}`}
                className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <p className="truncate font-semibold">{item.name}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-orange-300">{item.exam}</p>
            </div>
          </a>
        ))}
      </div>
      {groups.length > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-2" aria-label="Student success story slides">
          {groups.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveGroup(index)}
              aria-label={`Show student group ${index + 1}`}
              aria-current={index === activeGroup ? "true" : undefined}
              className={`h-2.5 rounded-full transition ${index === activeGroup ? "w-7 bg-orange-400" : "w-2.5 bg-white/25 hover:bg-white/50"}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
