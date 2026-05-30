import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto w-[92%] max-w-6xl py-10 text-slate-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">About BadamClasses</h1>
          <p className="mt-2 text-sm text-slate-300">A premium learning platform for SSC, Railway, Banking and State exams.</p>
        </div>
        <Link href="/" className="rounded-lg border border-white/20 px-4 py-2 text-sm">Back to Home</Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-card/70 p-6">
        <p className="text-sm text-slate-300">
          BadamClasses helps students learn smarter with a blend of live classes, recorded videos, and curated study material.
          Our mentors focus on results-driven preparation with structured plans, current affairs, and weekly mock tests.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#0b1634]/70 p-4">
            <p className="text-2xl font-semibold text-orange-300">50,000+</p>
            <p className="text-sm text-slate-300">Active learners</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1634]/70 p-4">
            <p className="text-2xl font-semibold text-orange-300">100+</p>
            <p className="text-sm text-slate-300">Expert mentors</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0b1634]/70 p-4">
            <p className="text-2xl font-semibold text-orange-300">500+</p>
            <p className="text-sm text-slate-300">Practice tests</p>
          </div>
        </div>
      </div>
    </main>
  );
}
