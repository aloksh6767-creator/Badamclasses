const faqs = [
  {
    q: "How do I enroll in a batch?",
    a: "Go to Batches on the homepage, select your preferred batch, click Enroll Now, and complete payment."
  },
  {
    q: "Do I get recorded classes?",
    a: "Yes. Enrolled students get recorded access, PDF notes, and mock tests."
  },
  {
    q: "How can I access purchased courses?",
    a: "After login, open Student Dashboard to view purchased courses and materials."
  },
  {
    q: "Do you provide doubt support?",
    a: "Yes. We provide doubt support through class sessions and mentor channels."
  }
];

export default function FaqPage() {
  return (
    <main className="mx-auto w-[94%] max-w-6xl py-10 text-slate-100">
      <h1 className="mb-6 font-display text-4xl">Frequently Asked Questions</h1>
      <div className="space-y-3">
        {faqs.map((item) => (
          <details key={item.q} className="rounded-xl border border-white/10 bg-[#0d1a3a]/70 p-4">
            <summary className="cursor-pointer font-semibold">{item.q}</summary>
            <p className="mt-2 text-sm text-slate-300">{item.a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
