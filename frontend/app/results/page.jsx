"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const initialForm = {
  studentName: "",
  phone: "",
  email: "",
  examName: "",
  batchName: "",
  testDate: "",
  center: "",
  notes: ""
};

export default function ResultsPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formNotice, setFormNotice] = useState("");
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupNotice, setLookupNotice] = useState("");
  const [lookupResults, setLookupResults] = useState([]);
  const [publishedResults, setPublishedResults] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch("/offline-tests?limit=6");
        setPublishedResults(Array.isArray(data) ? data : []);
      } catch {
        setPublishedResults([]);
      }
    })();
  }, []);

  const submitRegistration = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormNotice("");

    try {
      const data = await apiFetch("/offline-tests/register", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setFormNotice(`${data?.message || "Registration saved."} Roll No: ${data?.registration?.rollNumber || "Will be assigned soon"}`);
      setForm(initialForm);
    } catch (error) {
      setFormNotice(error.message || "Offline test registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const lookupMarks = async (event) => {
    event.preventDefault();
    setLookupLoading(true);
    setLookupNotice("");

    try {
      const data = await apiFetch(`/offline-tests/results?query=${encodeURIComponent(lookupQuery)}`);
      const list = Array.isArray(data) ? data : [];
      setLookupResults(list);
      if (!list.length) {
        setLookupNotice("Abhi is query ke liye result publish nahi hua hai.");
      }
    } catch (error) {
      setLookupResults([]);
      setLookupNotice(error.message || "Result lookup failed.");
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <main className="mx-auto w-[94%] max-w-6xl py-10 text-slate-100">
      <section className="rounded-[30px] border border-white/10 bg-[#0d1a3a]/70 p-6 shadow-[0_22px_70px_rgba(0,0,0,0.28)] lg:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-orange-300">Offline Test Desk</p>
        <h1 className="mt-3 font-display text-4xl">Offline Test Form & Results</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">
          Yahan student offline test ke liye registration kar sakta hai. Test ke baad isi page par marks aur result publish kiye ja sakte hain.
        </p>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-[#0b1634]/80 p-6">
          <h2 className="font-display text-2xl">Student Registration Form</h2>
          <form onSubmit={submitRegistration} className="mt-5 grid gap-4">
            <InputField label="Student Name" value={form.studentName} onChange={(value) => setForm({ ...form, studentName: value })} placeholder="Full name" required />
            <InputField label="Phone Number" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} placeholder="10-digit mobile number" required />
            <InputField label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} placeholder="Optional email" />
            <InputField label="Exam Name" value={form.examName} onChange={(value) => setForm({ ...form, examName: value })} placeholder="SSC GD Offline Test" required />
            <InputField label="Batch Name" value={form.batchName} onChange={(value) => setForm({ ...form, batchName: value })} placeholder="Udaan Batch / Maths Special" />
            <InputField label="Test Date" type="date" value={form.testDate} onChange={(value) => setForm({ ...form, testDate: value })} />
            <InputField label="Center" value={form.center} onChange={(value) => setForm({ ...form, center: value })} placeholder="Phoolbagh Branch" />
            <label className="grid gap-2 text-sm text-slate-200">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Notes</span>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Any note for test desk"
                className="rounded-xl border border-white/10 bg-[#081127] px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-70"
            >
              {submitting ? "Saving Registration..." : "Register for Offline Test"}
            </button>
            {formNotice ? (
              <div className="rounded-xl border border-orange-300/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
                {formNotice}
              </div>
            ) : null}
          </form>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#0b1634]/80 p-6">
          <h2 className="font-display text-2xl">Check Your Marks</h2>
          <p className="mt-3 text-sm text-slate-300">Phone number ya roll number enter karke result dekhein.</p>
          <form onSubmit={lookupMarks} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              value={lookupQuery}
              onChange={(event) => setLookupQuery(event.target.value)}
              placeholder="Phone number or roll number"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm text-white outline-none"
              required
            />
            <button
              type="submit"
              disabled={lookupLoading}
              className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-70"
            >
              {lookupLoading ? "Checking..." : "View Result"}
            </button>
          </form>
          {lookupNotice ? <p className="mt-4 text-sm text-orange-200">{lookupNotice}</p> : null}
          <div className="mt-5 grid gap-4">
            {lookupResults.map((item) => (
              <ResultCard key={item._id} item={item} />
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-[28px] border border-white/10 bg-[#0b1634]/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Recently Published Results</h2>
            <p className="mt-2 text-sm text-slate-300">Admin ya instructor marks upload karte hi latest results yahan dikhenge.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {publishedResults.length ? (
            publishedResults.map((item) => <ResultCard key={item._id} item={item} compact />)
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#081127] p-5 text-sm text-slate-400">
              Abhi tak koi offline test result publish nahi hua hai.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function InputField({ label, onChange, ...props }) {
  return (
    <label className="grid gap-2 text-sm text-slate-200">
      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <input
        {...props}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm text-white outline-none"
      />
    </label>
  );
}

function ResultCard({ item, compact = false }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#081127] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{item.studentName}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-orange-300">{item.examName}</p>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          {item.status === "results_published" ? "Result Published" : "Registered"}
        </span>
      </div>
      <div className={`mt-4 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        <Meta label="Roll No" value={item.rollNumber || "-"} />
        <Meta label="Batch" value={item.batchName || "-"} />
        <Meta label="Center" value={item.center || "-"} />
        <Meta label="Test Date" value={item.testDate || "-"} />
        <Meta
          label="Marks"
          value={
            item.marksObtained !== null && item.totalMarks !== null
              ? `${item.marksObtained}/${item.totalMarks}`
              : "Pending"
          }
        />
        <Meta label="Percentage" value={item.percentage !== null ? `${item.percentage}%` : "Pending"} />
        <Meta label="Rank" value={item.rank || "Pending"} />
      </div>
      {item.resultNotes ? <p className="mt-4 text-sm text-slate-300">{item.resultNotes}</p> : null}
    </article>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-100">{value}</p>
    </div>
  );
}
