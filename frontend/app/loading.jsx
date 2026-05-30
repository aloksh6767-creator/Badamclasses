export default function Loading() {
  return (
    <main className="mx-auto w-[94%] max-w-7xl py-10">
      <div className="skeleton-shimmer mb-8 h-72 w-full rounded-3xl border border-white/10 bg-[#0d1a3a]/70" />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-24 rounded-2xl border border-white/10 bg-[#0d1a3a]/70" />
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-3">
            <div className="skeleton-shimmer h-48 rounded-xl" />
            <div className="skeleton-shimmer mt-3 h-4 w-2/3 rounded" />
            <div className="skeleton-shimmer mt-2 h-3 w-1/2 rounded" />
            <div className="skeleton-shimmer mt-4 h-9 rounded-lg" />
          </div>
        ))}
      </div>
    </main>
  );
}
