"use client";

import { useEffect, useState } from "react";

const duration = 1200;

export default function StatsCounter({ items = [] }) {
  const visibleItems = items.filter((item) => Number(item?.value) > 0);
  const [values, setValues] = useState(visibleItems.map(() => 0));

  useEffect(() => {
    let rafId;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValues(visibleItems.map((item) => Math.floor((item.value || 0) * eased)));
      if (p < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [visibleItems]);

  if (!visibleItems.length) return null;

  return (
    <section className="animate-reveal stagger-1 mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {visibleItems.map((item, idx) => (
        <div
          key={item.label}
          className="stat-text-card card-anim rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5 text-center transition hover:-translate-y-1 hover:border-orange-300/40"
          style={{ "--stat-delay": `${idx * 140}ms` }}
        >
          <p className="stat-number-animate text-3xl font-bold">
            {values[idx].toLocaleString("en-IN")}
            {item.suffix || ""}
          </p>
          <p className="stat-label-animate mt-1">{item.label}</p>
        </div>
      ))}
    </section>
  );
}
