"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");

    try {
      const data = await apiFetch("/inquiries", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setNotice(data?.message || "Your message has been received.");
      setForm({ name: "", email: "", message: "" });
    } catch (error) {
      setNotice(error.message || "Message send nahi hua. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-[92%] max-w-6xl py-10 text-slate-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Contact Us</h1>
          <p className="mt-2 text-sm text-slate-300">Reach out for admission, payments, offline tests, or technical support.</p>
        </div>
        <Link href="/" className="rounded-lg border border-white/20 px-4 py-2 text-sm">Back to Home</Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-card/70 p-6">
          <h2 className="font-display text-2xl">Support Desk</h2>
          <p className="mt-2 text-sm text-slate-300">Email: support@badamclasses.com</p>
          <p className="text-sm text-slate-300">WhatsApp: +91 90000 11111</p>
          <p className="text-sm text-slate-300">Office Hours: 7 AM - 10 PM (IST)</p>
          <p className="mt-3 text-sm text-slate-300">Address: BadamClasses, Bhopal, Madhya Pradesh</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="mailto:support@badamclasses.com" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:border-orange-300">Email Support</a>
            <a href="tel:+919000011111" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:border-orange-300">Call Support</a>
            <Link href="/results" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:border-orange-300">Offline Test Desk</Link>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-card/70 p-6">
          <h2 className="font-display text-2xl">Send a Message</h2>
          <div className="mt-4 space-y-3">
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Your Name"
              className="w-full rounded-lg border border-white/10 bg-[#091127] px-3 py-2 text-sm text-white"
              required
            />
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email"
              className="w-full rounded-lg border border-white/10 bg-[#091127] px-3 py-2 text-sm text-white"
              required
            />
            <textarea
              rows="4"
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Message"
              className="w-full rounded-lg border border-white/10 bg-[#091127] px-3 py-2 text-sm text-white"
              required
            />
            <button type="submit" disabled={submitting} className="btn-gradient btn-anim w-full rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
              {submitting ? "Sending..." : "Send"}
            </button>
            {notice ? (
              <div className="rounded-xl border border-orange-300/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
                {notice}
              </div>
            ) : null}
          </div>
        </form>
      </div>
    </main>
  );
}
