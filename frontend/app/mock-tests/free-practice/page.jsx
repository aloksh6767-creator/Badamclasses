"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { originalFreePracticeQuestions } from "@/lib/mockTestCatalog";

export default function FreePracticePage() {
  const [pdfTests, setPdfTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState("original");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    const loadPdfTests = async () => {
      try {
        const response = await fetch("/mock-pdfs/mock-question-bank.json");
        const data = await response.json();
        if (active) {
          setPdfTests(Array.isArray(data) ? data : []);
        }
      } catch {
        if (active) {
          setPdfTests([]);
        }
      }
    };
    loadPdfTests();
    return () => {
      active = false;
    };
  }, []);

  const selectedTest = useMemo(() => {
    if (selectedTestId === "original") {
      return {
        id: "original",
        title: "BadamClasses Original Free SSC Practice",
        category: "SSC Practice",
        questions: originalFreePracticeQuestions
      };
    }
    return pdfTests.find((test) => test.id === selectedTestId) || {
      id: "original",
      title: "BadamClasses Original Free SSC Practice",
      category: "SSC Practice",
      questions: originalFreePracticeQuestions
    };
  }, [pdfTests, selectedTestId]);

  const allQuestions = selectedTest.questions || originalFreePracticeQuestions;
  const subjectOptions = useMemo(() => {
    const subjects = new Set(allQuestions.map((question) => question.section || selectedTest.subject || "Mixed Practice"));
    return Array.from(subjects).sort();
  }, [allQuestions, selectedTest.subject]);
  const questions = useMemo(() => {
    if (selectedSubject === "all") return allQuestions;
    return allQuestions.filter((question) => (question.section || selectedTest.subject || "Mixed Practice") === selectedSubject);
  }, [allQuestions, selectedSubject, selectedTest.subject]);
  const score = useMemo(
    () =>
      questions.reduce((total, question) => {
        return answers[question.id] === question.answer ? total + 1 : total;
      }, 0),
    [answers, questions]
  );

  const attempted = Object.keys(answers).length;
  const accuracy = attempted ? Math.round((score / attempted) * 100) : 0;
  const knownAnswerCount = questions.filter((question) => Number.isInteger(question.answer)).length;
  const topicBreakdown = useMemo(() => {
    const counts = new Map();
    questions.forEach((question) => {
      const topic = question.section || selectedTest.category || "General";
      counts.set(topic, (counts.get(topic) || 0) + 1);
    });
    return Array.from(counts, ([topic, count]) => ({ topic, count })).slice(0, 6);
  }, [questions, selectedTest.category]);
  const aiRecommendation = useMemo(() => {
    const firstTopic = topicBreakdown[0]?.topic || selectedTest.category || "core topics";
    if (!submitted) {
      return `AI help: pehle ${firstTopic} ke easy questions attempt karein, phir marked questions review karein.`;
    }
    if (!knownAnswerCount) {
      return `AI help: ${attempted}/${questions.length} attempted. Answer key pending hai, ab unattempted questions ko second round me solve karein.`;
    }
    return accuracy >= 75
      ? "AI help: accuracy strong hai. Ab timer reduce karke same topic ka speed round karein."
      : "AI help: weak questions ko error-log me likhein aur formula/concept revision ke baad retest karein.";
  }, [accuracy, attempted, knownAnswerCount, questions.length, selectedTest.category, submitted, topicBreakdown]);

  const switchTest = (event) => {
    setSelectedTestId(event.target.value);
    setSelectedSubject("all");
    setAnswers({});
    setSubmitted(false);
  };

  const switchSubject = (event) => {
    setSelectedSubject(event.target.value);
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <main className="mx-auto w-[94%] max-w-6xl py-8 text-slate-100">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">BadamClasses Original Mock</p>
          <h1 className="mt-2 font-display text-4xl text-white">PDF Based Mock Test</h1>
          <p className="mt-2 text-sm text-slate-300">
            PDF ke questions ko website ke andar mock-test format me convert kiya gaya hai. No external test portal opens from this page.
          </p>
        </div>
        <Link href="/mock-tests" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-orange-300">
          Back to Mock Tests
        </Link>
      </div>

      <section className="mb-5 rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300" htmlFor="mock-select">
          Select Mock Test
        </label>
        <select
          id="mock-select"
          value={selectedTestId}
          onChange={switchTest}
          className="mt-3 w-full rounded-xl border border-white/10 bg-[#071126] px-4 py-3 text-sm text-white outline-none focus:border-orange-300"
        >
          <option value="original">BadamClasses Original Free SSC Practice - {originalFreePracticeQuestions.length} Questions</option>
          {pdfTests.map((test) => (
            <option key={test.id} value={test.id}>
              {test.title} - {test.questions?.length || 0} Questions
            </option>
          ))}
        </select>
        <p className="mt-3 text-sm text-slate-300">
          Current: {selectedTest.title} | {selectedTest.category} | {questions.length} questions
        </p>
        <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300" htmlFor="subject-select">
          Subject / Topic Filter
        </label>
        <select
          id="subject-select"
          value={selectedSubject}
          onChange={switchSubject}
          className="mt-3 w-full rounded-xl border border-white/10 bg-[#071126] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
        >
          <option value="all">All Subjects - {allQuestions.length} Questions</option>
          {subjectOptions.map((subject) => (
            <option key={subject} value={subject}>
              {subject} - {allQuestions.filter((question) => (question.section || selectedTest.subject || "Mixed Practice") === subject).length} Questions
            </option>
          ))}
        </select>
        <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-50">
          {aiRecommendation}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {topicBreakdown.map((item) => (
            <span key={item.topic} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200">
              {item.topic}: {item.count}
            </span>
          ))}
        </div>
      </section>

      <section className="sticky top-20 z-10 mb-5 rounded-2xl border border-orange-300/25 bg-[#081127]/95 p-4 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <p className="text-xs text-slate-400">Timer</p>
            <p className="font-semibold text-orange-200">60:00 min pattern</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <p className="text-xs text-slate-400">Questions</p>
            <p className="font-semibold text-white">{questions.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <p className="text-xs text-slate-400">Attempted</p>
            <p className="font-semibold text-white">{attempted}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <p className="text-xs text-slate-400">Score</p>
            <p className="font-semibold text-emerald-200">{submitted && knownAnswerCount ? `${score}/${questions.length}` : "Review"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <p className="text-xs text-slate-400">Accuracy</p>
            <p className="font-semibold text-cyan-200">{submitted && knownAnswerCount ? `${accuracy}%` : "After submit"}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="space-y-4">
          {questions.map((question, index) => {
            const selected = answers[question.id];
            return (
              <article key={question.id} id={question.id} className="rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">{question.section}</p>
                    <h2 className="mt-2 text-lg font-semibold text-white">Q{index + 1}. {question.question}</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selected !== undefined ? "bg-emerald-500/15 text-emerald-200" : "border border-white/15 text-slate-300"}`}>
                    {selected !== undefined ? "Answered" : "Not Answered"}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selected === optionIndex;
                    const isCorrect = submitted && question.answer === optionIndex;
                    const isWrong = submitted && isSelected && question.answer !== optionIndex;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => !submitted && setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                          isCorrect
                            ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-100"
                            : isWrong
                              ? "border-rose-300/50 bg-rose-500/15 text-rose-100"
                              : isSelected
                                ? "border-orange-300/60 bg-orange-500/15 text-orange-100"
                                : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-orange-300/40"
                        }`}
                      >
                        {String.fromCharCode(65 + optionIndex)}. {option}
                      </button>
                    );
                  })}
                </div>
                {submitted ? (
                  <p className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-50">
                    {Number.isInteger(question.answer) ? `Explanation: ${question.explanation}` : "Answer key pending expert review. Your selected response is saved for practice."}
                  </p>
                ) : null}
              </article>
            );
          })}
        </section>

        <aside className="h-fit rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5 lg:sticky lg:top-40">
          <h2 className="font-display text-2xl text-white">Question Palette</h2>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {questions.map((question, index) => (
              <a
                key={question.id}
                href={`#${question.id}`}
                className={`inline-flex h-10 items-center justify-center rounded-lg border text-sm font-semibold ${
                  answers[question.id] !== undefined
                    ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
                    : "border-white/10 bg-white/[0.04] text-slate-300"
                }`}
              >
                {index + 1}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="btn-gradient btn-anim mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white"
          >
            Submit Test
          </button>
          {submitted ? (
            <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-50">
              {knownAnswerCount ? `Result: ${score}/${questions.length} correct, ${accuracy}% accuracy.` : `${attempted}/${questions.length} attempted. Answer key pending expert review.`}
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
