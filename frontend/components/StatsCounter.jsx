"use client";

import { useEffect, useState } from "react";

const duration = 1200;

export default function StatsCounter({ items = [] }) {
  const [values, setValues] = useState(items.map(() => 0));

  useEffect(() => {
    let rafId;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValues(items.map((item) => Math.floor((item.value || 0) * eased)));
      if (p < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [items]);

  return (
    <section className="animate-reveal stagger-1 mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, idx) => (
        <div key={item.label} className="card-anim rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5 text-center transition hover:-translate-y-1 hover:border-orange-300/40">
          <p className="text-3xl font-bold text-orange-400">
            {values[idx].toLocaleString("en-IN")}
            {item.suffix || ""}
          </p>
          <p className="mt-1 text-slate-300">{item.label}</p>
        </div>
      ))}
    </section>
  );
}
