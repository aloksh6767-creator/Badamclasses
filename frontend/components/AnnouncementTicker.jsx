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
  linkLabel: "Help",
  priority: "High"
};

const BUILT_IN_ANNOUNCEMENTS = [
  DEFAULT_ANNOUNCEMENT,
  {
    title: "Admissions Open",
    message: "New batches are available for SSC, Railway, Reasoning, Arithmetic, and other competitive exams.",
    link: "/courses",
    linkLabel: "View Courses",
    priority: "New"
  },
  {
    title: "Student Support",
    message: "For enrollment, payment, PDFs, or class access support, contact the BadamClasses team anytime.",
    link: "/contact",
    linkLabel: "Contact",
    priority: "Support"
  }
];

const SPEEDS = {
  slow: { label: "Slow", duration: "34s" },
  normal: { label: "Normal", duration: "24s" },
  fast: { label: "Fast", duration: "16s" }
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

const normalizeAnnouncement = (notice, fallback = DEFAULT_ANNOUNCEMENT) => {
  if (!notice || typeof notice !== "object") return null;
  const title = String(notice.title || fallback.title || "").trim();
  const message = String(notice.message || notice.text || fallback.message || "").trim();
  if (!title && !message) return null;

  return {
    ...fallback,
    ...notice,
    title,
    message,
    link: notice.link || notice.href || fallback.link || "",
    linkLabel: notice.linkLabel || notice.ctaLabel || fallback.linkLabel || "Details",
    priority: notice.priority || notice.badge || fallback.priority || "Info"
  };
};

const getRemoteAnnouncements = (content = {}) => {
  const items = [];
  const notice = normalizeAnnouncement(content.notice);
  if (notice) items.push(notice);

  if (Array.isArray(content.notifications)) {
    content.notifications.forEach((item) => {
      const normalized = normalizeAnnouncement(item, { ...DEFAULT_ANNOUNCEMENT, priority: "Update" });
      if (normalized) items.push(normalized);
    });
  }

  const offer = content.offerBanner;
  if (offer?.enabled && (offer.title || offer.text)) {
    const normalizedOffer = normalizeAnnouncement(
      {
        title: offer.title || "Special Offer",
        message: offer.text,
        link: offer.link || "/courses",
        linkLabel: "View Offer",
        priority: "Offer"
      },
      DEFAULT_ANNOUNCEMENT
    );
    if (normalizedOffer) items.push(normalizedOffer);
  }

  return items;
};

export default function AnnouncementTicker() {
  const [localNotice, setLocalNotice] = useState(null);
  const [remoteAnnouncements, setRemoteAnnouncements] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState("normal");

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "1");
      setSpeed(window.localStorage.getItem("badamclasses_announcement_speed") || "normal");
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
          setRemoteAnnouncements(getRemoteAnnouncements(data?.content || {}));
        }
      } catch {
        if (active) setRemoteAnnouncements([]);
      }
    };

    loadRemoteNotice();
    return () => {
      active = false;
    };
  }, []);

  const announcements = useMemo(() => {
    const local = normalizeAnnouncement(localNotice);
    const merged = [...remoteAnnouncements, ...(local ? [local] : []), ...BUILT_IN_ANNOUNCEMENTS]
      .filter(Boolean)
      .filter((item, index, items) => {
        const key = `${item.title}::${item.message}`.toLowerCase();
        return items.findIndex((entry) => `${entry.title}::${entry.message}`.toLowerCase() === key) === index;
      });
    return merged.length ? merged : [DEFAULT_ANNOUNCEMENT];
  }, [localNotice, remoteAnnouncements]);

  useEffect(() => {
    setActiveIndex((current) => (current >= announcements.length ? 0 : current));
  }, [announcements.length]);

  useEffect(() => {
    if (paused || announcements.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % announcements.length);
    }, 9000);
    return () => window.clearInterval(timer);
  }, [announcements.length, paused]);

  const announcement = announcements[activeIndex] || announcements[0] || DEFAULT_ANNOUNCEMENT;
  const text = [announcement.title, announcement.message].filter(Boolean).join(" - ");
  const speedConfig = SPEEDS[speed] || SPEEDS.normal;

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

  const cycleSpeed = () => {
    const nextSpeed = speed === "normal" ? "fast" : speed === "fast" ? "slow" : "normal";
    setSpeed(nextSpeed);
    try {
      window.localStorage.setItem("badamclasses_announcement_speed", nextSpeed);
    } catch {
      // Local storage is only used for preference persistence.
    }
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % announcements.length);
  };

  return (
    <div className="announcement-ticker" role="region" aria-label="Site announcements">
      <div className="announcement-ticker-icon" aria-hidden="true">!</div>
      <span className="announcement-ticker-priority">{announcement.priority || "Info"}</span>
      <div className="announcement-ticker-track" tabIndex={0}>
        <div
          className="announcement-ticker-copy"
          style={{
            animationDuration: speedConfig.duration,
            animationPlayState: paused ? "paused" : undefined
          }}
        >
          <span>{text}</span>
          <span aria-hidden="true">{text}</span>
        </div>
      </div>
      <div className="announcement-ticker-controls" aria-label="Announcement controls">
        <button type="button" onClick={() => setPaused((value) => !value)} className="announcement-ticker-control">
          {paused ? "Play" : "Pause"}
        </button>
        <button type="button" onClick={cycleSpeed} className="announcement-ticker-control">
          {speedConfig.label}
        </button>
        {announcements.length > 1 ? (
          <button type="button" onClick={showNext} className="announcement-ticker-control">
            {activeIndex + 1}/{announcements.length}
          </button>
        ) : null}
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
