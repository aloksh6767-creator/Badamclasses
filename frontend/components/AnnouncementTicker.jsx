"use client";

import { useEffect, useMemo, useState } from "react";
import { getPublicApiUrl } from "@/lib/apiConfig";

const NOTICE_KEY = "badamclasses_site_notice";
const DISMISS_KEY = "badamclasses_announcement_ticker_dismissed";

const DEFAULT_ANNOUNCEMENT = {
  title: "Important Notice",
  message:
    "The Objection/Grievance Portal for TET (01/UPTET/2026) will be open from 08 Jul 2026 18:00:00 to 14 Jul 2026 23:59:00. Candidates are advised to check updates on time.",
  link: "/contact",
  linkLabel: "Help"
};

const readLocalNotice = () => {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(NOTICE_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

export default function AnnouncementTicker() {
  const [localNotice, setLocalNotice] = useState(null);
  const [remoteNotice, setRemoteNotice] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "1");
      setLocalNotice(readLocalNotice());
    } catch {
      setDismissed(false);
      setLocalNotice(null);
    }

    const syncNotice = () => setLocalNotice(readLocalNotice());
    window.addEventListener("storage", syncNotice);
    return () => window.removeEventListener("storage", syncNotice);
  }, []);

  useEffect(() => {
    let active = true;

    const loadRemoteNotice = async () => {
      try {
        const publicContentUrl = getPublicApiUrl("/automation/public-content");
        if (!publicContentUrl) return;

        const response = await fetch(publicContentUrl, { cache: "no-store" });
        if (!response.ok) return;

        const data = await response.json();
        if (active) {
          setRemoteNotice(data?.content?.notice || null);
        }
      } catch {
        if (active) setRemoteNotice(null);
      }
    };

    loadRemoteNotice();
    return () => {
      active = false;
    };
  }, []);

  const announcement = useMemo(() => {
    const source = remoteNotice?.title || remoteNotice?.message ? remoteNotice : localNotice;
    return {
      ...DEFAULT_ANNOUNCEMENT,
      ...(source || {}),
      message: source?.message || source?.text || DEFAULT_ANNOUNCEMENT.message
    };
  }, [localNotice, remoteNotice]);

  const text = [announcement.title, announcement.message].filter(Boolean).join(" - ");

  if (dismissed || !text.trim()) {
    return null;
  }

  const dismissTicker = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Session storage is optional; hiding for this render is enough.
    }
  };

  return (
    <div className="announcement-ticker" role="status" aria-live="polite">
      <div className="announcement-ticker-icon" aria-hidden="true">!</div>
      <div className="announcement-ticker-track" tabIndex={0}>
        <div className="announcement-ticker-copy">
          <span>{text}</span>
          <span aria-hidden="true">{text}</span>
        </div>
      </div>
      {announcement.link ? (
        <a href={announcement.link} className="announcement-ticker-link">
          {announcement.linkLabel || "Details"}
        </a>
      ) : null}
      <button type="button" onClick={dismissTicker} className="announcement-ticker-close" aria-label="Hide announcement">
        x
      </button>
    </div>
  );
}
