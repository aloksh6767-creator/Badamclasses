"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function OnlineTestPage() {
  const { testId } = useParams();
  const router = useRouter();
  const [test, setTest] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(true);
  const [instructionAccepted, setInstructionAccepted] = useState(false);

  const loadAttempt = useCallback(async (id) => {
    const result = await apiFetch(`/test-rank/attempts/${encodeURIComponent(id)}`);
    const current = result.attempt;
    if (current.status === "submitted") {
      router.replace(`/result/${encodeURIComponent(id)}`);
      return;
    }
    setAttempt(current);
    setAnswers(current.answers || {});
    setSeconds(current.remainingSeconds || 0);
  }, [router]);

  useEffect(() => {
    if (!testId) return;
    let cancelled = false;
    apiFetch(`/test-rank/tests/${encodeURIComponent(testId)}`).then((data) => { if (!cancelled) setTest(data); }).catch((error) => { if (!cancelled) setMessage(error.message); });
    const existing = sessionStorage.getItem(`badam_attempt_${testId}`);
    if (existing && getToken()) loadAttempt(existing).catch(() => sessionStorage.removeItem(`badam_attempt_${testId}`));
    return () => { cancelled = true; };
  }, [testId, loadAttempt]);

  const start = async () => {
    setBusy(true); setMessage("");
    try {
      const data = await apiFetch(`/test-rank/tests/${encodeURIComponent(testId)}/attempts`, { method: "POST" });
      sessionStorage.setItem(`badam_attempt_${testId}`, data.attempt.id);
      setAttempt(data.attempt); setAnswers(data.attempt.answers || {}); setSeconds(data.attempt.remainingSeconds || 0);
    } catch (error) {
      setMessage(error.message);
      if (/not authorized|session expired/i.test(error.message)) router.push(`/login?redirect=${encodeURIComponent(`/test/${testId}`)}`);
    } finally { setBusy(false); }
  };

  const submit = useCallback(async (automatic = false) => {
    if (!attempt || busy) return;
    setBusy(true); setMessage("");
    try {
      await apiFetch(`/test-rank/attempts/${encodeURIComponent(attempt.id)}/answers`, { method: "PUT", body: JSON.stringify({ answers }) });
    } catch (error) {
      if (!/already been submitted|time is up/i.test(error.message)) { setMessage(error.message); setBusy(false); return; }
    }
    try {
      const data = await apiFetch(`/test-rank/attempts/${encodeURIComponent(attempt.id)}/submit`, { method: "POST", body: "{}" });
      sessionStorage.removeItem(`badam_attempt_${testId}`);
      router.replace(`/result/${encodeURIComponent(data.attempt.id)}`);
    } catch (error) { setMessage(error.message); setBusy(false); }
  }, [answers, attempt, busy, router, testId]);

  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;
    const tick = () => setSeconds(Math.max(0, Math.ceil((new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt]);
  useEffect(() => { if (attempt && seconds === 0 && attempt.status === "in_progress") void submit(true); }, [attempt, seconds, submit]);

  const choose = async (questionIndex, optionIndex) => {
    const next = { ...answers, [String(questionIndex)]: optionIndex };
    setAnswers(next); setSaved(false);
    try {
      const data = await apiFetch(`/test-rank/attempts/${encodeURIComponent(attempt.id)}/answers`, { method: "PUT", body: JSON.stringify({ answers: next }) });
      setAttempt((current) => current ? { ...current, answers: data.attempt.answers } : current);
      setSaved(true);
    } catch (error) { setMessage(error.message); }
  };

  if (!test) return <Shell><section role={message ? "alert" : "status"} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${message ? "bg-rose-400/10 text-rose-200" : "bg-sky-400/10 text-sky-200"}`}><TestIcon name={message ? "alert" : "paper"} className="h-6 w-6" /></span><div><h1 className="text-lg font-bold text-white">{message ? "Test could not be opened" : "Preparing your test"}</h1><p className="mt-1 text-sm leading-6 text-slate-300">{message || "Loading the test details and exam controls…"}</p>{message ? <Link href="/test-rank" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:border-sky-300/40"><TestIcon name="arrowLeft" className="h-4 w-4" /> Back to TestRank</Link> : null}</div></section></Shell>;
  const format = (value) => `${Math.floor(value / 60).toString().padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = Number(test.questionCount) || attempt?.questions?.length || 0;
  const answerProgress = totalQuestions ? Math.min(100, Math.round((answeredCount / totalQuestions) * 100)) : 0;
  return <Shell>
    <header className="mb-5 flex items-center justify-between gap-3">
      <Link href="/test-rank" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[.03] px-3 text-sm font-semibold text-slate-200 transition hover:border-sky-300/30 hover:text-white"><TestIcon name="arrowLeft" className="h-4 w-4 text-sky-300" />TestRank Library</Link>
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/[.06] px-3 py-1.5 text-[11px] font-semibold text-emerald-100"><TestIcon name="shield" className="h-4 w-4" />Secure test session</span>
    </header>

    <section className="overflow-hidden rounded-2xl border border-sky-300/20 bg-[radial-gradient(ellipse_at_90%_0%,rgba(14,116,220,.2),transparent_40%),linear-gradient(135deg,#0a1d39,#081426_72%)] p-5 shadow-[0_20px_55px_rgba(0,0,0,.22)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/[.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-sky-200"><TestIcon name="paper" className="h-4 w-4" />{test.examName || "Mock test"}</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">{test.title}</h1>
          <p className="mt-2 text-sm text-slate-300">Exam-style practice with a timed, saved test session.</p>
        </div>
        {attempt ? <div className={`sticky top-3 z-10 min-w-[142px] rounded-xl border px-4 py-3 text-center shadow-lg ${seconds < 300 ? "border-rose-400/40 bg-rose-950/90 text-rose-100 shadow-rose-950/20" : "border-sky-300/25 bg-slate-950/90 text-white shadow-slate-950/20"}`} aria-live="polite"><span className="flex items-center justify-center gap-2 font-mono text-xl font-bold"><TestIcon name="clock" className="h-5 w-5" />{format(seconds)}</span><span className="mt-1 block text-[10px] font-medium text-slate-300">{saved ? "Answers saved" : "Saving answer…"}</span></div> : null}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <TestMeta icon="paper" label="Questions" value={totalQuestions || "—"} />
        <TestMeta icon="clock" label="Duration" value={`${test.durationMinutes || "—"} min`} />
        <TestMeta icon="award" label="Marks per question" value={test.marksPerQuestion ?? "—"} />
      </div>
    </section>

    {message && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-sm text-rose-100"><TestIcon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>}
    {!attempt ? <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/75 shadow-lg">
      <div className="border-b border-white/10 bg-slate-950/40 px-5 py-4 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-amber-200">Instructions, Terms &amp; Conditions</p>
        <h2 className="mt-1 text-xl font-semibold text-white">Before you begin / शुरू करने से पहले</h2>
        <p className="mt-1 text-sm text-slate-300">{test.title} · {test.examName || "Mock test"}</p>
      </div>
      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          <Instruction icon="paper" text={`Exam overview / परीक्षा परिचय: ${totalQuestions || "—"} questions, ${test.durationMinutes || "—"} minutes. Questions are shown in the language provided with this test. / ${totalQuestions || "—"} प्रश्न, ${test.durationMinutes || "—"} मिनट। प्रश्न इस टेस्ट में उपलब्ध भाषा में दिखेंगे।`} />
          <Instruction icon="clock" text="Timing / समय: The timer starts when you continue. The test is submitted automatically when time runs out. / आगे बढ़ने पर टाइमर शुरू होगा। समय समाप्त होने पर टेस्ट अपने आप जमा हो जाएगा।" />
          <Instruction icon="checkCircle" text="Answering / उत्तर देना: Select one available option for each question. Your answers are saved as you work, and you can change them before submitting. / हर प्रश्न के लिए एक विकल्प चुनें। उत्तर काम करते समय सेव होते हैं और जमा करने से पहले बदले जा सकते हैं।" />
          <Instruction icon="award" text={`Scoring / अंक: ${Number(test.negativeMarks) > 0 ? `${test.negativeMarks} marks are deducted for each wrong answer.` : "No negative marking is configured for this test."} Your result is calculated from the published answer key. / परिणाम प्रकाशित उत्तर-कुंजी के आधार पर बनेगा।`} />
          <Instruction icon="shield" text="Navigation & submission / नेविगेशन और सबमिशन: Scroll through the questions, review your selections, then submit when ready. Once submitted, answers cannot be changed. / प्रश्नों को स्क्रॉल करके देखें, उत्तर जाँचें और तैयार होने पर सबमिट करें। सबमिट करने के बाद उत्तर नहीं बदले जा सकते।" />
        </div>
        <aside className="rounded-xl border border-sky-300/15 bg-slate-950/40 p-4">
          <TestMeta icon="clock" label="Duration / समय" value={`${test.durationMinutes || "—"} min`} />
          <div className="mt-2"><TestMeta icon="paper" label="Questions / प्रश्न" value={totalQuestions || "—"} /></div>
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[.04] p-3 text-xs leading-5 text-slate-200">
            <input type="checkbox" checked={instructionAccepted} onChange={(event) => setInstructionAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-sky-400" />
            <span>I have read and understood these instructions. / मैंने निर्देश पढ़ और समझ लिए हैं।</span>
          </label>
          <button onClick={start} disabled={busy || !instructionAccepted} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-3 font-bold text-white shadow-lg shadow-blue-950/30 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"><TestIcon name={getToken() ? "arrowRight" : "shield"} className="h-5 w-5" />{busy ? "Starting test…" : getToken() ? "Next / आगे" : "Next / आगे · Log in"}</button>
        </aside>
      </div>
    </section> : <>
      <section aria-label="Attempt progress" className="mt-5 rounded-xl border border-white/10 bg-slate-900/75 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">Test progress</p><p className="mt-1 text-sm font-semibold text-white">{answeredCount} of {totalQuestions} answered</p></div><span className="rounded-full border border-sky-300/20 bg-sky-400/[.08] px-3 py-1 text-xs font-bold text-sky-100">{answerProgress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-[width] duration-300" style={{ width: `${answerProgress}%` }} /></div></section>
      <div className="mt-4 grid gap-3">{attempt.questions.map((question) => {
        const selectedAnswer = answers[String(question.index)];
        return <article key={question.index} className="rounded-2xl border border-white/10 bg-slate-900/75 p-4 shadow-lg shadow-black/10 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[.07] pb-3"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg border border-sky-300/20 bg-sky-400/10 text-sm font-bold text-sky-100">{question.index + 1}</span><span className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">Question</span></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${selectedAnswer !== undefined ? "bg-emerald-400/10 text-emerald-200" : "bg-white/[.05] text-slate-400"}`}><TestIcon name={selectedAnswer !== undefined ? "checkCircle" : "clock"} className="h-3.5 w-3.5" />{selectedAnswer !== undefined ? "Answered" : "Not answered"}</span></div>
          <h2 className="mt-4 text-base font-semibold leading-7 text-white sm:text-lg">{question.question}</h2>
          <div role="radiogroup" aria-label={`Answers for question ${question.index + 1}`} className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((option, index) => {
            const selected = selectedAnswer === index;
            return <button key={`${question.index}-${index}`} type="button" role="radio" aria-checked={selected} disabled={busy} onClick={() => choose(question.index, index)} className={`group flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-60 ${selected ? "border-sky-300/55 bg-sky-500/15 text-white shadow-sm shadow-sky-950/30" : "border-white/10 bg-slate-950/45 text-slate-300 hover:border-sky-300/30 hover:bg-slate-950/70"}`}><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? "border-sky-300 bg-sky-400 text-slate-950" : "border-slate-500 text-transparent group-hover:border-sky-300"}`}>{selected ? <TestIcon name="check" className="h-3.5 w-3.5" /> : null}</span><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[.06] text-[11px] font-bold text-sky-200">{String.fromCharCode(65 + index)}</span><span className="min-w-0">{option}</span></button>;
          })}</div>
        </article>;
      })}</div>
      <div className="sticky bottom-3 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-xl shadow-black/30 backdrop-blur sm:p-4"><div className="flex items-center gap-2 text-xs text-slate-300"><span className="inline-flex items-center gap-1.5"><TestIcon name="checkCircle" className="h-4 w-4 text-emerald-300" />{answeredCount} answered</span><span className="text-slate-600">·</span><span>{Math.max(0, totalQuestions - answeredCount)} remaining</span></div><button onClick={() => { if (window.confirm("Submit your answers now? You cannot change them afterwards.")) void submit(); }} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-2.5 font-bold text-slate-950 shadow-lg shadow-orange-950/20 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-wait disabled:opacity-60">{busy ? "Submitting…" : "Submit test"}<TestIcon name="arrowRight" className="h-4 w-4" /></button></div>
    </>}
  </Shell>;
}

function Shell({ children }) { return <main className="min-h-screen bg-[radial-gradient(ellipse_at_20%_0%,rgba(14,116,220,.1),transparent_35%),#030d1b] px-4 py-6 text-slate-100 sm:px-6 sm:py-8"><div className="mx-auto max-w-5xl">{children}</div></main>; }

function TestMeta({ icon, label, value }) { return <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-400/10 text-sky-200"><TestIcon name={icon} className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><span className="mt-0.5 block truncate text-xs font-bold text-white">{value}</span></span></div>; }
function Instruction({ icon, text }) { return <div className="flex items-start gap-2.5 rounded-xl border border-white/[.07] bg-white/[.025] px-3 py-3 text-xs leading-5 text-slate-300"><TestIcon name={icon} className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />{text}</div>; }
function TestIcon({ name, className = "h-5 w-5" }) {
  const paths = {
    paper: <><path d="M6 3.5h8l4 4V20H6z"/><path d="M14 3.5v5h5M9 12h6M9 16h6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    shield: <><path d="m12 3 8 3v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/></>,
    award: <><circle cx="12" cy="8" r="5"/><path d="m8 12-1 9 5-3 5 3-1-9M10 8l1.3 1.3L14.5 7"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    checkCircle: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    alert: <><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/></>,
    arrowLeft: <><path d="M19 12H5m6 6-6-6 6-6"/></>,
    arrowRight: <><path d="M5 12h14m-6-6 6 6-6 6"/></>
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.paper}</svg>;
}
