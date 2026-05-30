"use client";

import { useEffect, useState } from "react";

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="back-top btn-anim fixed bottom-24 right-6 z-50 rounded-full border border-orange-300/50 bg-[#0f172a]/90 px-4 py-2 text-sm font-semibold text-orange-200"
      aria-label="Back to top"
    >
      Top
    </button>
  );
}
