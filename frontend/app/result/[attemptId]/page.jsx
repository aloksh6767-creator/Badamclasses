"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function TestResultPage() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!attemptId) return;
    if (!getToken()) { setError("Log in with the account used for this test to view its result."); return; }
    let active = true;
    apiFetch(`/test-rank/attempts/${encodeURIComponent(attemptId)}`).then(({ attempt: data }) => {
      if (!active) return;
      setAttempt(data);
      if (data.testId) apiFetch(`/test-rank/tests/${encodeURIComponent(data.testId)}/leaderboard`).then((board) => { if (active) setLeaderboard(board); }).catch(() => {});
    }).catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [attemptId]);

  return <main className="min-h-screen bg-[#030d1b] px-4 py-10 text-slate-100 sm:px-6"><div className="mx-auto max-w-4xl">
    <Link href="/test-rank" className="text-sm text-sky-300">← Back to TestRank</Link>
    {error ? <div role="alert" className="mt-6 rounded-xl border border-amber-300/20 bg-amber-500/10 p-5 text-amber-100">{error}{!getToken() && <Link className="ml-3 underline" href={`/login?redirect=${encodeURIComponent(`/result/${attemptId}`)}`}>Log in</Link>}</div> : !attempt ? <p className="mt-6 text-slate-300">Loading verified result…</p> : <>
      <div className="mt-6 rounded-2xl border border-sky-300/20 bg-[linear-gradient(135deg,#0a2141,#071326)] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-sky-300">Verified test result</p><h1 className="mt-2 text-3xl font-bold">{attempt.title}</h1><p className="mt-1 text-slate-400">{attempt.examName}</p><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Score", `${attempt.result?.score ?? 0} / ${attempt.result?.maxMarks ?? 0}`], ["Correct", attempt.result?.correct ?? 0], ["Incorrect", attempt.result?.incorrect ?? 0], ["Unanswered", attempt.result?.unanswered ?? 0]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>)}</div><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300"><span>Accuracy: <b className="text-white">{attempt.result?.accuracy ?? 0}%</b></span><span>Time: <b className="text-white">{Math.floor((attempt.result?.timeTakenSeconds || 0) / 60)}m {(attempt.result?.timeTakenSeconds || 0) % 60}s</b></span></div></div>
      {attempt.questions?.some((question) => Number.isInteger(question.correctAnswer)) ? <section className="mt-6 space-y-3"><h2 className="text-xl font-bold">Answer review</h2>{attempt.questions.map((question) => <article key={question.index} className="rounded-xl border border-white/10 bg-slate-900/70 p-4"><p className="font-medium">{question.index + 1}. {question.question}</p><p className="mt-2 text-sm text-emerald-200">Correct answer: {question.options[question.correctAnswer]}</p>{question.explanation && <p className="mt-1 text-sm text-slate-400">{question.explanation}</p>}</article>)}</section> : null}
      <section className="mt-7 rounded-2xl border border-white/10 bg-slate-900/60 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Test leaderboard</h2><span className="text-xs text-slate-400">{leaderboard ? `${leaderboard.participantCount} verified submissions` : "Loading…"}</span></div>{leaderboard?.leaderboard?.length ? <ol className="mt-4 divide-y divide-white/10">{leaderboard.leaderboard.map((item) => <li key={`${item.rank}-${item.displayName}`} className={`flex items-center justify-between gap-4 py-3 text-sm ${item.rank === 1 ? "text-amber-200" : "text-slate-200"}`}><span><b className="mr-3 text-slate-400">#{item.rank}</b>{item.displayName}</span><span className="font-semibold">{item.score}/{item.maxMarks}</span></li>)}</ol> : leaderboard ? <p className="mt-4 text-sm text-slate-400">No eligible submissions yet.</p> : null}</section>
    </>}
  </div></main>;
}
