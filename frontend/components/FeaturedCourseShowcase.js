"use client";

import Link from "next/link";

const formatPrice = (value) => {
  const amount = Number(value || 0);
  return amount > 0 ? amount.toLocaleString("en-IN") : "Free";
};

export default function FeaturedCourseShowcase({ batches = [] }) {
  if (!Array.isArray(batches) || batches.length === 0) {
    return null;
  }

  return (
    <section className="animate-reveal mb-14 rounded-3xl border border-white/10 bg-[#0d1a3a]/70 p-5 md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-orange-300">Curated Picks</p>
          <h2 className="mt-2 font-display text-3xl font-semibold text-white">Featured Courses</h2>
        </div>
        <Link href="/courses" className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-200 transition hover:border-orange-300">
          Explore All Courses
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {batches.map((batch, index) => (
          <article
            key={batch.id || `${batch.title}-${index}`}
            className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#10214a_0%,#0a1531_100%)] shadow-[0_18px_50px_rgba(2,6,23,0.3)]"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img src={batch.image} alt={batch.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />
              {batch.badge ? (
                <span className="absolute left-4 top-4 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                  {batch.badge}
                </span>
              ) : null}
              {batch.tag ? (
                <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-slate-950/55 px-3 py-1 text-xs font-semibold text-slate-100">
                  {batch.tag}
                </span>
              ) : null}
            </div>

            <div className="p-5">
              <h3 className="font-display text-2xl text-white">{batch.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{batch.description}</p>

              {Array.isArray(batch.meta) && batch.meta.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {batch.meta.map((item, metaIndex) => (
                    <span
                      key={`${batch.id || batch.title}-meta-${metaIndex}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold text-orange-300">
                    <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
                    {formatPrice(batch.price)}
                  </p>
                  {Number(batch.originalPrice || 0) > Number(batch.price || 0) ? (
                    <p className="text-sm text-slate-400 line-through">
                      <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
                      {formatPrice(batch.originalPrice)}
                    </p>
                  ) : null}
                </div>

                <Link
                  href={`/checkout?course=${encodeURIComponent(batch.id || batch.title)}`}
                  className="btn-gradient btn-anim rounded-xl px-4 py-2 text-sm font-semibold text-white"
                >
                  Enroll Now
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
