"use client";

import { useEffect, useState } from "react";
import { getPublicApiUrl } from "@/lib/apiConfig";

const NOTICE_KEY = "badamclasses_site_notice";

export default function SiteNotificationPopup() {
  const [notice, setNotice] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      let local = null;
      try { local = JSON.parse(window.localStorage.getItem(NOTICE_KEY) || "null"); } catch {}
      let remote = null;
      try {
        const response = await fetch(getPublicApiUrl("/automation/public-content"), { cache: "no-store" });
        if (response.ok) remote = (await response.json())?.content?.notice;
      } catch {}
      const next = remote?.title || remote?.message ? remote : local;
      if (!active || !next?.title && !next?.message) return;
      setNotice(next);
      setVisible(true);
    };
    load();
    return () => { active = false; };
  }, []);

  if (!visible || !notice) return null;
  const close = () => {
    setVisible(false);
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/55 px-4 pt-20 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Website notification">
      <section className="relative w-full max-w-md rounded-2xl border border-orange-300/50 bg-[#0b1d43] p-6 text-white shadow-[0_20px_80px_rgba(2,6,23,.65)]">
        <button type="button" onClick={close} aria-label="Close notification" className="absolute right-3 top-3 rounded-full px-2 text-xl text-slate-300 hover:text-white">×</button>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Important update</p>
        <h2 className="mt-3 pr-8 text-2xl font-bold">{notice.title || "Website update"}</h2>
        <p className="mt-3 leading-6 text-slate-300">{notice.message || notice.text}</p>
        {notice.link ? <a href={notice.link} onClick={close} className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-400">{notice.linkLabel || "View details"}</a> : null}
      </section>
    </div>
  );
}
