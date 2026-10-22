"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(date);
};

export default function SscOfficialAnswerKeysPage() {
  const [filters, setFilters] = useState({ exams: [], years: [], statuses: [] });
  const [draft, setDraft] = useState({ exam: "", year: "", tier: "", status: "" });
  const [applied, setApplied] = useState({ exam: "", year: "", tier: "", status: "" });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ records: [], pagination: { total: 0, pages: 0 } });
  const [summary, setSummary] = useState({ total: 0, lastUpdatedAt: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch("/ssc-answer-keys/public/filters")
      .then((response) => { if (active) setFilters({ exams: response.exams || [], years: response.years || [], statuses: response.statuses || [] }); })
      .catch(() => {});
    apiFetch("/ssc-answer-keys/public/summary")
      .then((response) => { if (active) setSummary({ total: response.total || 0, lastUpdatedAt: response.lastUpdatedAt || null }); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: "100" });
    Object.entries(applied).forEach(([key, value]) => { if (value) params.set(key, value); });
    setLoading(true);
    apiFetch(`/ssc-answer-keys/public?${params.toString()}`)
      .then((response) => {
        if (!active) return;
        setResult({ records: response.records || [], pagination: response.pagination || { total: 0, pages: 0 } });
        setError("");
      })
      .catch((loadError) => { if (active) setError(loadError.message || "Official answer keys could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied, page]);

  const records = useMemo(() => result.records || [], [result.records]);
  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setApplied({ ...draft });
  };
  const clearFilters = () => {
    const empty = { exam: "", year: "", tier: "", status: "" };
    setDraft(empty);
    setApplied(empty);
    setPage(1);
  };

  return (
    <main className="mx-auto min-h-[70vh] w-[92%] max-w-7xl py-8 text-slate-100 sm:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Official source · answer labels only</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">SSC Official Answer Keys</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Browse answer labels extracted from publicly accessible SSC answer-key PDFs. Question text, options, explanations, and candidate response sheets are not published here.</p>
        </div>
        <Link href="/mock-tests" className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/40 hover:bg-white/5">Back to mock tests</Link>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-sky-300/15 bg-sky-400/[0.06] px-4 py-3 text-sm text-slate-300">
        <span><strong className="text-white">{summary.total}</strong> published answer labels</span>
        <span>Last updated: {formatDate(summary.lastUpdatedAt)}</span>
        <a href="https://ssc.gov.in/home/answer-key" target="_blank" rel="noreferrer" className="font-semibold text-sky-300 underline decoration-sky-300/30 underline-offset-4">Open official SSC source</a>
      </div>

      <form onSubmit={applyFilters} className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-[#0b1634]/70 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="grid gap-1.5 text-xs text-slate-400">Exam
          <select value={draft.exam} onChange={(event) => setDraft({ ...draft, exam: event.target.value })} className="min-h-11 rounded-xl border border-white/10 bg-[#081127] px-3 text-sm text-white">
            <option value="">All SSC exams</option>{filters.exams.map((exam) => <option key={exam} value={exam}>{exam}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-slate-400">Year
          <select value={draft.year} onChange={(event) => setDraft({ ...draft, year: event.target.value })} className="min-h-11 rounded-xl border border-white/10 bg-[#081127] px-3 text-sm text-white">
            <option value="">All years</option>{filters.years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-slate-400">Tier
          <input value={draft.tier} onChange={(event) => setDraft({ ...draft, tier: event.target.value })} placeholder="e.g. Tier-I" className="min-h-11 rounded-xl border border-white/10 bg-[#081127] px-3 text-sm text-white placeholder:text-slate-500" />
        </label>
        <label className="grid gap-1.5 text-xs text-slate-400">Key status
          <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="min-h-11 rounded-xl border border-white/10 bg-[#081127] px-3 text-sm text-white">
            <option value="">All statuses</option>{filters.statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="min-h-11 flex-1 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white hover:bg-indigo-400">Apply filters</button>
          <button type="button" onClick={clearFilters} className="min-h-11 rounded-xl border border-white/10 px-3 text-sm text-slate-300 hover:bg-white/5">Clear</button>
        </div>
      </form>

      {error ? <div role="alert" className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
      <section aria-label="Official SSC answer labels" className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1634]/60">
        {loading ? <p className="p-8 text-center text-sm text-slate-300">Loading official answer labels…</p> : records.length ? <>
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Exam</th><th className="px-4 py-3">Year / tier</th><th className="px-4 py-3">Exam date / shift</th><th className="px-4 py-3">Question ID</th><th className="px-4 py-3">Official answer label</th><th className="px-4 py-3">Key status</th><th className="px-4 py-3">Source</th></tr></thead>
              <tbody className="divide-y divide-white/5">{records.map((record) => <tr key={`${record.exam}-${record.year}-${record.tier}-${record.examDate}-${record.shift}-${record.questionId}`}>
                <td className="px-4 py-3 font-medium text-white">{record.exam}</td>
                <td className="px-4 py-3 text-slate-300">{record.year}{record.tier ? ` · ${record.tier}` : ""}</td>
                <td className="px-4 py-3 text-slate-300">{record.examDate || "—"}{record.shift ? ` · ${record.shift}` : ""}</td>
                <td className="px-4 py-3 font-mono text-slate-300">{record.questionId}</td>
                <td className="px-4 py-3 font-semibold text-cyan-100">{record.answerLabel}</td>
                <td className="px-4 py-3"><span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-200">{record.keyStatus}</span></td>
                <td className="px-4 py-3"><a href={record.sourceUrl} target="_blank" rel="noreferrer" className="text-sky-300 underline decoration-sky-300/30 underline-offset-4">Official PDF</a></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs text-slate-400">
            <span>{result.pagination?.total || 0} results · page {page} of {Math.max(1, result.pagination?.pages || 1)}</span>
            <div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-40">Previous</button><button type="button" disabled={page >= (result.pagination?.pages || 1)} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-40">Next</button></div>
          </div>
        </> : <div className="p-8 text-center">
          <h2 className="text-lg font-semibold text-white">No public answer-key data available</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">SSC may publish a notice without a public bulk answer-key PDF. In that case, we keep the notice and official source link, and leave answer data unavailable. Candidate login response sheets are not collected.</p>
          <a href="https://ssc.gov.in/home/answer-key" target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl border border-sky-300/20 px-4 py-2.5 text-sm font-semibold text-sky-200 hover:bg-sky-400/10">Check SSC official notices</a>
        </div>}
      </section>
    </main>
  );
}
