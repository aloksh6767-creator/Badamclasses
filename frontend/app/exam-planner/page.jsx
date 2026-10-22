"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getUser } from "@/lib/auth";

const STORAGE_KEY = "badamclasses_exam_planner_v1";

const defaultExams = [
  {
    id: "ssc-cgl-tier-1",
    title: "SSC CGL Tier 1",
    subject: "Maths, Reasoning, English, GS",
    date: "2026-08-25",
    priority: "High",
    location: "Online mock center",
    syllabus: 42
  },
  {
    id: "railway-ntpc",
    title: "Railway NTPC Practice Test",
    subject: "Reasoning and General Awareness",
    date: "2026-09-12",
    priority: "Medium",
    location: "BadamClasses app",
    syllabus: 28
  }
];

const defaultTasks = [
  { id: "task-quant", title: "Revise percentage and profit-loss", subject: "Maths", date: "2026-07-09", minutes: 90, done: false, priority: "High" },
  { id: "task-reasoning", title: "Attempt 40 reasoning questions", subject: "Reasoning", date: "2026-07-09", minutes: 60, done: false, priority: "Medium" },
  { id: "task-gs", title: "Read current affairs notes", subject: "GS", date: "2026-07-10", minutes: 45, done: true, priority: "Low" }
];

const priorityStyles = {
  High: "border-rose-300/35 bg-rose-500/10 text-rose-100",
  Medium: "border-orange-300/35 bg-orange-500/10 text-orange-100",
  Low: "border-emerald-300/35 bg-emerald-500/10 text-emerald-100"
};

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const daysUntil = (date) => {
  const target = new Date(`${date}T23:59:59`);
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
};

const clampPercent = (value) => Math.min(100, Math.max(0, Number(value || 0)));

function loadPlanner() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { exams: defaultExams, tasks: defaultTasks, dailyGoal: 180 };
    const parsed = JSON.parse(raw);
    return {
      exams: Array.isArray(parsed.exams) ? parsed.exams : defaultExams,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : defaultTasks,
      dailyGoal: Number(parsed.dailyGoal || 180)
    };
  } catch {
    return { exams: defaultExams, tasks: defaultTasks, dailyGoal: 180 };
  }
}

function savePlanner(next) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export default function ExamPlannerPage() {
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("");
  const [exams, setExams] = useState(defaultExams);
  const [tasks, setTasks] = useState(defaultTasks);
  const [dailyGoal, setDailyGoal] = useState(180);
  const [examForm, setExamForm] = useState({
    title: "",
    subject: "",
    date: "",
    priority: "High",
    location: "",
    syllabus: 0
  });
  const [taskForm, setTaskForm] = useState({
    title: "",
    subject: "",
    date: "",
    minutes: 45,
    priority: "Medium"
  });

  useEffect(() => {
    const stored = loadPlanner();
    setExams(stored.exams);
    setTasks(stored.tasks);
    setDailyGoal(stored.dailyGoal);
    setUserName(getUser()?.name?.split(" ")[0] || "");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    savePlanner({ exams, tasks, dailyGoal });
  }, [dailyGoal, exams, mounted, tasks]);

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [exams]
  );

  const todayKey = new Date().toISOString().slice(0, 10);
  const todaysTasks = useMemo(
    () => tasks.filter((task) => task.date === todayKey).sort((a, b) => Number(b.minutes || 0) - Number(a.minutes || 0)),
    [tasks, todayKey]
  );

  const completedMinutes = useMemo(
    () => todaysTasks.filter((task) => task.done).reduce((sum, task) => sum + Number(task.minutes || 0), 0),
    [todaysTasks]
  );

  const totalStudyMinutes = useMemo(
    () => tasks.reduce((sum, task) => sum + Number(task.minutes || 0), 0),
    [tasks]
  );

  const completionRate = tasks.length
    ? Math.round((tasks.filter((task) => task.done).length / tasks.length) * 100)
    : 0;

  const weakSubject = useMemo(() => {
    const bySubject = new Map();
    tasks.forEach((task) => {
      const key = task.subject || "General";
      const current = bySubject.get(key) || { total: 0, done: 0 };
      bySubject.set(key, {
        total: current.total + 1,
        done: current.done + (task.done ? 1 : 0)
      });
    });
    return [...bySubject.entries()]
      .sort((a, b) => (a[1].done / a[1].total) - (b[1].done / b[1].total))[0]?.[0] || "Maths";
  }, [tasks]);

  const aiPlan = useMemo(() => {
    const nearest = sortedExams[0];
    const days = nearest ? daysUntil(nearest.date) : null;
    const focus = weakSubject || nearest?.subject || "core subjects";
    return [
      `Focus block: ${focus} for ${Math.max(45, Math.floor(dailyGoal * 0.45))} minutes.`,
      `Revision block: complete ${nearest?.title || "your next exam"} weak topics before practice.`,
      `Mock block: attempt one timed quiz, then note 3 mistakes for tomorrow.`,
      days !== null && days <= 7 ? "High urgency: keep only revision, mock analysis, and formula recall in the plan." : "Keep one short break after every 50 minutes."
    ];
  }, [dailyGoal, sortedExams, weakSubject]);

  const addExam = (event) => {
    event.preventDefault();
    if (!examForm.title.trim() || !examForm.date) return;
    setExams((current) => [
      {
        ...examForm,
        id: makeId("exam"),
        title: examForm.title.trim(),
        subject: examForm.subject.trim() || "General",
        location: examForm.location.trim() || "To be updated",
        syllabus: clampPercent(examForm.syllabus)
      },
      ...current
    ]);
    setExamForm({ title: "", subject: "", date: "", priority: "High", location: "", syllabus: 0 });
  };

  const addTask = (event) => {
    event.preventDefault();
    if (!taskForm.title.trim() || !taskForm.date) return;
    setTasks((current) => [
      {
        ...taskForm,
        id: makeId("task"),
        title: taskForm.title.trim(),
        subject: taskForm.subject.trim() || "General",
        minutes: Math.max(10, Number(taskForm.minutes || 45)),
        done: false
      },
      ...current
    ]);
    setTaskForm({ title: "", subject: "", date: todayKey, minutes: 45, priority: "Medium" });
  };

  const toggleTask = (taskId) => {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)));
  };

  const removeExam = (examId) => {
    setExams((current) => current.filter((exam) => exam.id !== examId));
  };

  const removeTask = (taskId) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  };

  return (
    <main className="mx-auto w-[94%] max-w-7xl py-8 text-slate-100">
      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,#081127_0%,#13264f_56%,#071126_100%)] p-5 shadow-[0_28px_80px_rgba(2,6,23,0.35)] md:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-orange-300/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">
              AI Exam Planner
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-6xl">
              {userName ? `${userName}'s smart study command center` : "Smart study command center"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Plan exams, track syllabus, build daily timetables, and get practical AI-style study recommendations that keep working in local fallback mode.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#planner-forms" className="btn-gradient btn-anim rounded-xl px-5 py-3 text-sm font-semibold text-white">
                Create Plan
              </a>
              <Link href="/mock-tests" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-slate-100 hover:border-orange-300">
                Open Mock Tests
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Daily goal</p>
              <p className="mt-3 font-display text-4xl text-white">{dailyGoal}m</p>
              <input
                type="range"
                min="60"
                max="480"
                step="15"
                value={dailyGoal}
                onChange={(event) => setDailyGoal(Number(event.target.value))}
                className="mt-5 w-full"
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Today done</p>
              <p className="mt-3 font-display text-4xl text-white">{completedMinutes}m</p>
              <p className="mt-4 text-sm text-slate-300">{Math.min(100, Math.round((completedMinutes / dailyGoal) * 100)) || 0}% of goal</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Completion</p>
              <p className="mt-3 font-display text-4xl text-white">{completionRate}%</p>
              <p className="mt-4 text-sm text-slate-300">Across all tasks</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Study bank</p>
              <p className="mt-3 font-display text-4xl text-white">{Math.round(totalStudyMinutes / 60)}h</p>
              <p className="mt-4 text-sm text-slate-300">Planned effort</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">AI daily planner</p>
          <h2 className="mt-2 font-display text-3xl">Today&apos;s recommended flow</h2>
          <div className="mt-5 grid gap-3">
            {aiPlan.map((item, index) => (
              <div key={item} className="rounded-xl border border-white/10 bg-[#081127]/80 p-4 text-sm text-slate-200">
                <span className="mr-2 font-semibold text-orange-200">0{index + 1}</span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Upcoming exams</p>
          <div className="mt-4 grid gap-3">
            {sortedExams.map((exam) => {
              const days = daysUntil(exam.date);
              return (
                <article key={exam.id} className="rounded-xl border border-white/10 bg-[#081127]/75 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{exam.title}</h3>
                      <p className="mt-1 text-sm text-slate-300">{exam.subject}</p>
                      <p className="mt-2 text-xs text-slate-400">{exam.date} - {exam.location}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${priorityStyles[exam.priority] || priorityStyles.Medium}`}>
                        {exam.priority}
                      </span>
                      <p className="mt-2 text-2xl font-bold text-orange-200">{days ?? "-"}d</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-cyan-300" style={{ width: `${clampPercent(exam.syllabus)}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                    <span>Syllabus {clampPercent(exam.syllabus)}%</span>
                    <button type="button" onClick={() => removeExam(exam.id)} className="text-rose-200 hover:text-rose-100">Remove</button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="planner-forms" className="mt-6 grid gap-5 lg:grid-cols-2">
        <form onSubmit={addExam} className="rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
          <h2 className="font-display text-2xl">Add Exam</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={examForm.title} onChange={(event) => setExamForm((current) => ({ ...current, title: event.target.value }))} placeholder="Exam title" className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm outline-none" />
            <input value={examForm.subject} onChange={(event) => setExamForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Subjects" className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm outline-none" />
            <input type="date" value={examForm.date} onChange={(event) => setExamForm((current) => ({ ...current, date: event.target.value }))} className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm outline-none" />
            <select value={examForm.priority} onChange={(event) => setExamForm((current) => ({ ...current, priority: event.target.value }))} className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm outline-none">
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <input value={examForm.location} onChange={(event) => setExamForm((current) => ({ ...current, location: event.target.value }))} placeholder="Hall ticket/location notes" className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm outline-none sm:col-span-2" />
            <label className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm sm:col-span-2">
              Syllabus completion: {examForm.syllabus}%
              <input type="range" min="0" max="100" value={examForm.syllabus} onChange={(event) => setExamForm((current) => ({ ...current, syllabus: Number(event.target.value) }))} className="mt-2 w-full" />
            </label>
          </div>
          <button type="submit" className="btn-gradient btn-anim mt-4 rounded-xl px-5 py-3 text-sm font-semibold text-white">Save Exam</button>
        </form>

        <form onSubmit={addTask} className="rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
          <h2 className="font-display text-2xl">Add Study Task</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder="Task title" className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm outline-none sm:col-span-2" />
            <input value={taskForm.subject} onChange={(event) => setTaskForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Subject" className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm outline-none" />
            <input type="date" value={taskForm.date} onChange={(event) => setTaskForm((current) => ({ ...current, date: event.target.value }))} className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm outline-none" />
            <input type="number" min="10" value={taskForm.minutes} onChange={(event) => setTaskForm((current) => ({ ...current, minutes: Number(event.target.value) }))} placeholder="Minutes" className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm outline-none" />
            <select value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value }))} className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm outline-none">
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <button type="submit" className="btn-gradient btn-anim mt-4 rounded-xl px-5 py-3 text-sm font-semibold text-white">Save Task</button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Task manager</p>
            <h2 className="mt-2 font-display text-3xl">Study sessions</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{tasks.length} tasks</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {tasks.map((task) => (
            <article key={task.id} className="rounded-xl border border-white/10 bg-[#081127]/75 p-4">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} className="mt-1 h-5 w-5 accent-orange-500" />
                <div className="min-w-0 flex-1">
                  <h3 className={`text-lg font-semibold ${task.done ? "text-slate-400 line-through" : "text-white"}`}>{task.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{task.subject} - {task.minutes} min - {task.date}</p>
                </div>
                <button type="button" onClick={() => removeTask(task.id)} className="shrink-0 rounded-lg border border-rose-300/20 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/10">
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
