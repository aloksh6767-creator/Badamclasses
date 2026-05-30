"use client";

import { useEffect, useState } from "react";

export default function TestimonialsCarousel({ items = [] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!items.length) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 3200);
    return () => clearInterval(id);
  }, [items.length]);

  if (!items.length) return null;

  const active = items[index];

  return (
    <section id="results" className="animate-reveal stagger-2 mb-14">
      <h2 className="mb-6 font-display text-3xl font-semibold">Student Success Stories</h2>
      <article key={active.name} className="card-anim fade-swap max-w-3xl rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-6 transition hover:border-orange-300/40">
        <div className="mb-3 flex items-center gap-3">
          <img src={active.image} alt={active.name} className="h-14 w-14 rounded-full object-cover" />
          <div>
            <p className="font-semibold">{active.name}</p>
            <p className="text-xs text-orange-300">Cleared: {active.exam}</p>
          </div>
        </div>
        <p className="text-sm text-slate-300">"{active.review}"</p>
      </article>
      <div className="mt-4 flex gap-2">
        {items.map((item, i) => (
          <button
            key={item.name}
            onClick={() => setIndex(i)}
            className={`h-2.5 w-8 rounded-full transition ${i === index ? "bg-orange-400" : "bg-white/30"}`}
            aria-label={`Go to ${item.name}`}
          />
        ))}
      </div>
    </section>
  );
}
