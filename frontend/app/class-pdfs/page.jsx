"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

const toPdfItem = (item = {}, index = 0, source = "resource") => {
  const url = String(item.url || item.pdfUrl || item.notesUrl || item.href || "").trim();
  if (!url) return null;

  return {
    id: item.id || `${source}-${index}-${url}`,
    title: String(item.title || item.name || item.label || `Class PDF ${index + 1}`).trim(),
    url,
    meta: String(item.subject || item.type || item.description || "Class study material").trim()
  };
};

const getBatchPdfs = (batch = {}) => {
  const resources = Array.isArray(batch.pdfResources) ? batch.pdfResources : [];
  const classPdfs = (Array.isArray(batch.classSections) ? batch.classSections : []).map((section, index) =>
    toPdfItem(section, index, "class")
  );

  const all = [...resources.map((item, index) => toPdfItem(item, index)), ...classPdfs].filter(Boolean);
  const seen = new Set();
  return all.filter((item) => {
    const key = `${item.title.toLowerCase()}-${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function ClassPdfsPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPdfs = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/courses");
      setBatches(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || "Class PDFs could not be loaded right now.");
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPdfs();
  }, []);

  const pdfBatches = useMemo(
    () => batches.map((batch) => ({ ...batch, pdfs: getBatchPdfs(batch) })).filter((batch) => batch.pdfs.length),
    [batches]
  );

  return (
    <main className="mx-auto w-[92%] max-w-6xl py-10 text-slate-100">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-300/25 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_38%),linear-gradient(135deg,rgba(13,26,58,0.96),rgba(8,17,39,0.98))] p-6 shadow-[0_24px_70px_rgba(2,8,23,0.28)] sm:p-9">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Study Library</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">Class PDFs</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">Batch-wise class notes, practice sheets aur study material ek hi jagah par access karein.</p>
        </div>
      </section>

      <div className="mt-7 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-400">Admin batch update karte hi latest PDFs yahan dikhai denge.</p>
        <Link href="/batches" className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/50 hover:bg-cyan-400/10">View Batches</Link>
      </div>

      {error ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-300/40 bg-orange-500/10 p-4 text-sm text-orange-100">
          <span>{error}</span>
          <button type="button" onClick={loadPdfs} className="rounded-lg border border-orange-200/40 px-3 py-1.5 font-semibold transition hover:bg-orange-300/10">Retry</button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-7 grid gap-5 md:grid-cols-2" aria-busy="true" aria-label="Loading class PDFs">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-52 rounded-3xl border border-white/10 bg-card/70 p-5"><div className="skeleton-shimmer h-6 w-2/5 rounded" /><div className="skeleton-shimmer mt-6 h-12 w-full rounded-xl" /><div className="skeleton-shimmer mt-3 h-12 w-4/5 rounded-xl" /></div>)}
        </div>
      ) : pdfBatches.length ? (
        <section className="mt-7 grid gap-5 md:grid-cols-2">
          {pdfBatches.map((batch) => (
            <article key={batch._id || batch.id || batch.routeId || batch.title} className="rounded-3xl border border-white/10 bg-card/75 p-5 shadow-[0_18px_48px_rgba(2,8,23,0.2)] backdrop-blur transition hover:-translate-y-1 hover:border-cyan-300/35">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.17em] text-cyan-200">{batch.category || batch.subject || "Batch"}</p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-white">{batch.title || "Class Batch"}</h2>
                </div>
                <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-100">{batch.pdfs.length} PDFs</span>
              </div>
              <div className="mt-4 grid gap-2">
                {batch.pdfs.map((pdf) => (
                  <a key={pdf.id} href={pdf.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 transition hover:border-orange-300/40 hover:bg-orange-500/10">
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-100">{pdf.title}</span><span className="mt-0.5 block truncate text-xs text-slate-400">{pdf.meta}</span></span>
                    <span className="shrink-0 rounded-lg border border-orange-300/30 px-2.5 py-1 text-xs font-bold text-orange-100 transition group-hover:bg-orange-400 group-hover:text-slate-950">Open PDF</span>
                  </a>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="mt-7 rounded-3xl border border-dashed border-white/15 bg-white/[0.035] p-8 text-center text-slate-300">
          <p className="font-display text-2xl font-bold text-white">Class PDFs are being updated</p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6">Admin panel se batch select karke Class PDFs add karein. Publish hote hi woh yahan automatically appear ho jayenge.</p>
        </div>
      )}
    </main>
  );
}
