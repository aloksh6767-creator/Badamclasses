"use client";

import { useEffect, useMemo, useState } from "react";
import { getPublicApiUrl } from "@/lib/apiConfig";

const NOTICE_KEY = "badamclasses_site_notice";

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

  useEffect(() => {
    try {
      setLocalNotice(readLocalNotice());
    } catch {
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
    if (announcements.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % announcements.length);
    }, 9000);
    return () => window.clearInterval(timer);
  }, [announcements.length]);

  const announcement = announcements[activeIndex] || announcements[0] || DEFAULT_ANNOUNCEMENT;
  const text = [announcement.title, announcement.message].filter(Boolean).join(" - ");

  if (!text.trim()) {
    return null;
  }

  return (
    <div className="announcement-ticker" role="region" aria-label="Site announcements">
      <div className="announcement-ticker-icon" aria-hidden="true">!</div>
      <span className="announcement-ticker-priority">{announcement.priority || "Info"}</span>
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
    </div>
  );
}
