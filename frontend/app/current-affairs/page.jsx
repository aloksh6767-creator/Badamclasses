import Link from "next/link";
import CurrentAffairsSection from "@/components/CurrentAffairsSection";

export default function CurrentAffairsPage() {
  return (
    <main className="mx-auto w-[94%] max-w-7xl py-10 text-slate-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Current Affairs</h1>
          <p className="mt-2 text-sm text-slate-300">Daily, monthly, and quiz-based updates with PDFs.</p>
        </div>
        <Link href="/" className="rounded-lg border border-white/20 px-4 py-2 text-sm">Back to Home</Link>
      </div>
      <CurrentAffairsSection />
    </main>
  );
}
