import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[70vh] w-[92%] max-w-3xl place-items-center py-10 text-center">
      <div className="rounded-2xl border border-white/10 bg-card/70 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-orange-300">404</p>
        <h1 className="mt-3 font-display text-3xl">Page not found</h1>
        <p className="mt-2 text-slate-300">The page you are looking for doesn’t exist.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-xl bg-accent px-4 py-2 font-semibold text-white">Go Home</Link>
        </div>
      </div>
    </main>
  );
}
