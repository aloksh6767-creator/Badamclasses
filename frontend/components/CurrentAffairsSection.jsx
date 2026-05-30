"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getPublicApiUrl } from "@/lib/apiConfig";

const FALLBACK_CURRENT_AFFAIRS_DATE = "2026-05-12T00:00:00.000Z";
const FALLBACK_DAILY_LABEL = "12/5/2026";
const FALLBACK_MONTHLY_LABEL = "May 2026";

const fallbackData = {
  generatedAt: FALLBACK_CURRENT_AFFAIRS_DATE,
  dailyLabel: FALLBACK_DAILY_LABEL,
  monthlyLabel: FALLBACK_MONTHLY_LABEL,
  topics: ["All", "National", "International", "Economy", "Polity", "Science & Tech", "Sports"],
  daily: [
    { topic: "National", headline: "Govt announces new digital scholarship drive", summary: "Scholarship registrations open with AI-enabled verification and fast approvals." },
    { topic: "Economy", headline: "RBI keeps policy rate unchanged", summary: "Focus remains on stable inflation and steady growth momentum." },
    { topic: "Science & Tech", headline: "ISRO schedules new weather satellite launch", summary: "Mission to improve monsoon and climate forecasting." }
  ],
  monthly: [
    { topic: "Polity", bucket: "Key Bills & Policies", highlights: ["Education reform updates", "Digital governance push", "Exam recruitment simplification"] },
    { topic: "Economy", bucket: "Economy Highlights", highlights: ["Credit growth remains stable", "Banking reforms announced", "Inflation within target range"] },
    { topic: "Sports", bucket: "Sports Highlights", highlights: ["National games announced", "New sports quotas for exams", "Khelo India updates"] }
  ],
  quiz: [
    { id: 1, question: "Which institution announces monetary policy in India?", options: ["RBI", "SEBI", "NITI Aayog", "ECI"], answer: 0 },
    { id: 2, question: "ISRO is associated with which field?", options: ["Space", "Railways", "Sports", "Banking"], answer: 0 },
    { id: 3, question: "Which exam commonly uses current affairs?", options: ["SSC", "Railway", "Banking", "All of the above"], answer: 3 }
  ],
  source: "fallback"
};

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
      active
        ? "bg-orange-500 text-white"
        : "border border-white/20 bg-[#0b1634] text-slate-200 hover:border-orange-300"
    }`}
  >
    {children}
  </button>
);

export default function CurrentAffairsSection() {
  const [tab, setTab] = useState("daily");
  const [topic, setTopic] = useState("All");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  const load = async (selectedTopic = "All") => {
    setLoading(true);
    try {
      const res = await apiFetch(`/current-affairs/dashboard?topic=${encodeURIComponent(selectedTopic)}`);
      setData(res);
    } catch {
      setData({ ...fallbackData, topic: selectedTopic });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("All");
  }, []);

  useEffect(() => {
    setAnswers({});
    setSubmitted(false);
    setPdfOpen(false);
    load(topic);
  }, [topic]);

  const score = useMemo(() => {
    if (!data?.quiz?.length) return 0;
    return data.quiz.reduce((acc, q) => acc + (answers[q.id] === q.answer ? 1 : 0), 0);
  }, [answers, data]);

  const onChoose = (qid, optIndex) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qid]: optIndex }));
  };

  const onSubmitQuiz = () => setSubmitted(true);

  const topics = Array.from(new Set(["All", ...(data?.topics || [])]));
  const dailyPdfUrl = getPublicApiUrl(`/current-affairs/pdf?topic=${encodeURIComponent(topic)}&mode=daily`);
  const monthlyPdfUrl = getPublicApiUrl(`/current-affairs/pdf?topic=${encodeURIComponent(topic)}&mode=monthly`);
  const yearlyPdfUrl = getPublicApiUrl(`/current-affairs/pdf?topic=${encodeURIComponent(topic)}&mode=year`);

  return (
    <section id="current-affairs" className="animate-reveal mb-14 rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl font-semibold">Daily & Monthly Current Affairs</h2>

        <div className="flex flex-wrap gap-2">
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="rounded-lg border border-white/20 bg-[#0b1634] px-3 py-2 text-sm text-slate-100"
          >
            {topics.map((t, idx) => (
              <option key={`${t}-${idx}`} value={t}>
                {t}
              </option>
            ))}
          </select>

          <div className="relative">
            <button
              onClick={() => setPdfOpen((v) => !v)}
              className="btn-gradient btn-anim rounded-lg px-4 py-2 text-sm font-semibold text-white"
            >
              PDF Download
            </button>
            {pdfOpen ? (
              <div className="absolute right-0 top-12 z-20 w-40 rounded-lg border border-white/15 bg-[#0b1634] p-2 shadow-2xl">
                <a href={dailyPdfUrl} target="_blank" onClick={() => setPdfOpen(false)} className="block rounded-md px-3 py-2 text-sm text-slate-100 hover:bg-orange-500/20">Daily PDF</a>
                <a href={monthlyPdfUrl} target="_blank" onClick={() => setPdfOpen(false)} className="mt-1 block rounded-md px-3 py-2 text-sm text-slate-100 hover:bg-orange-500/20">Monthly PDF</a>
                <a href={yearlyPdfUrl} target="_blank" onClick={() => setPdfOpen(false)} className="mt-1 block rounded-md px-3 py-2 text-sm text-slate-100 hover:bg-orange-500/20">Yearly PDF</a>
              </div>
            ) : null}
          </div>

          <button onClick={() => load(topic)} className="rounded-lg border border-orange-300/50 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-200">
            Refresh
          </button>
          <TabButton active={tab === "daily"} onClick={() => setTab("daily")}>Daily</TabButton>
          <TabButton active={tab === "monthly"} onClick={() => setTab("monthly")}>Monthly</TabButton>
          <TabButton active={tab === "quiz"} onClick={() => setTab("quiz")}>Quiz</TabButton>
        </div>
      </div>

      {loading ? <div className="rounded-xl border border-white/10 bg-[#0b1634] p-4 text-slate-300">Loading current affairs...</div> : null}

      {!loading && data && tab === "daily" ? (
        <div>
          <p className="mb-3 text-sm text-orange-200">Updated for {data.dailyLabel} ({topic})</p>
          <div className="grid gap-3 md:grid-cols-3">
            {(data.daily || []).map((item) => (
              <article key={`${item.topic || item.category}-${item.headline}`} className="rounded-xl border border-white/10 bg-[#0b1634] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-orange-300">{item.topic || item.category}</p>
                <h3 className="mt-2 text-lg font-semibold">{item.headline}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.summary}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && data && tab === "monthly" ? (
        <div>
          <p className="mb-3 text-sm text-orange-200">Monthly digest: {data.monthlyLabel} ({topic})</p>
          <div className="grid gap-3 md:grid-cols-3">
            {(data.monthly || []).map((bucket) => (
              <article key={`${bucket.topic}-${bucket.bucket}`} className="rounded-xl border border-white/10 bg-[#0b1634] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{bucket.topic || "Topic"}</p>
                <h3 className="mt-2 text-lg font-semibold">{bucket.bucket}</h3>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">
                  {(bucket.highlights || []).map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && data && tab === "quiz" ? (
        <div className="space-y-4">
          {(data.quiz || []).map((q) => (
            <article key={q.id} className="rounded-xl border border-white/10 bg-[#0b1634] p-4">
              <p className="font-semibold">Q{q.id}. {q.question}</p>
              <div className="mt-3 grid gap-2">
                {(q.options || []).map((opt, idx) => {
                  const selected = answers[q.id] === idx;
                  const correct = submitted && q.answer === idx;
                  const wrong = submitted && selected && q.answer !== idx;

                  return (
                    <button
                      key={`${q.id}-${opt}`}
                      onClick={() => onChoose(q.id, idx)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                        correct
                          ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                          : wrong
                          ? "border-red-400 bg-red-500/15 text-red-200"
                          : selected
                          ? "border-orange-300 bg-orange-500/15"
                          : "border-white/15 bg-[#0f1e43] hover:border-orange-300"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={onSubmitQuiz} className="btn-gradient btn-anim rounded-lg px-4 py-2 font-semibold text-white">Submit Quiz</button>
            {submitted ? <p className="text-sm text-orange-200">Score: {score}/{(data.quiz || []).length}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
