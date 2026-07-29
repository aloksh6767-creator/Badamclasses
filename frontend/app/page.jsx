"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import StatsCounter from "@/components/StatsCounter";
import { siteContact } from "@/lib/siteContact";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import CurrentAffairsSection from "@/components/CurrentAffairsSection";
import { batches, exams, faqs, features, testimonials } from "@/lib/fixtures";
import { getUser } from "@/lib/auth";
import { getPublicApiUrl } from "@/lib/apiConfig";
import { getCourseFallbackImage, resolveCourseImage } from "@/lib/courseImages";
import { filterDeletedCourses, filterDeletedCoursesFromStorage, readDeletedCourseKeys, readLocalCourses } from "@/lib/localCourseState";
import { mockExamCategories } from "@/lib/mockTestCatalog";
import { applySliderConfig, getLiveCountdown, getOfferBanner, getSliderConfig, isBatchLiveNow, pruneExpiredLiveNow } from "@/lib/sliderConfig";
const NOTICE_KEY = "badamclasses_site_notice";
const ADMISSION_POPUP_DISMISSED_KEY = "badamclasses_admission_popup_dismissed";

const HOMEPAGE_BANNER_FALLBACKS = {
  newBatch: "/new-batch-starts-2026.webp",
  legacyBatch: "/new-batch-starts-2026.webp",
  promo: "/new-batch-starts-2026.webp",
  hero: "/ssc-complete-batch-2026.webp",
  offer: "/new-batch-starts-2026.webp"
};

const isRenderableImage = (value = "") => {
  const raw = String(value || "").trim();
  return /^https?:\/\//i.test(raw) || raw.startsWith("/");
};

const resolveBannerImage = (value, fallback) => {
  return isRenderableImage(value) ? value : fallback;
};

const homepagePrimaryBanners = [
  {
    id: "railway-batch-2026",
    image: "/slider-railway-batch.webp",
    fallback: HOMEPAGE_BANNER_FALLBACKS.hero,
    alt: "Badam Singh Classes Railway Batch",
    label: "Railway Batch",
    exploreHref: "/courses",
    mockHref: "/mock-tests",
    enrollHref: "/batches"
  },
  {
    id: "journey-made-simple",
    image: "/slider-journey-made-simple.webp",
    fallback: HOMEPAGE_BANNER_FALLBACKS.hero,
    alt: "Badam Singh Classes learning journey made simple",
    label: "Learning Journey",
    exploreHref: "/courses",
    mockHref: "/mock-tests",
    enrollHref: "/courses"
  },
  {
    id: "new-batch-starts",
    image: "/slider-new-batch-starts.webp",
    fallback: HOMEPAGE_BANNER_FALLBACKS.hero,
    alt: "Badam Singh Classes new batch starts",
    label: "New Batch Starts",
    exploreHref: "/courses",
    mockHref: "/mock-tests",
    enrollHref: "/courses"
  },
  {
    id: "journey-made-simple-alt",
    image: "/slider-journey-made-simple-alt.webp",
    fallback: HOMEPAGE_BANNER_FALLBACKS.hero,
    alt: "Badam Singh Classes learning journey made simple",
    label: "Learning Journey",
    exploreHref: "/courses",
    mockHref: "/mock-tests",
    enrollHref: "/courses"
  },
  {
    id: "welcome-badamclasses",
    image: "/slider-welcome-badamclasses-3x1.webp",
    fallback: HOMEPAGE_BANNER_FALLBACKS.hero,
    alt: "Welcome to Badam Singh Classes",
    label: "Welcome to BadamClasses",
    exploreHref: "/courses",
    mockHref: "/mock-tests",
    enrollHref: "/courses"
  }
];

const slugifyBatchPart = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const inferBatchType = (batch) => {
  if (batch?.type) return String(batch.type).trim();
  if (batch?.mode) return String(batch.mode).trim();

  const title = String(batch?.title || "").toLowerCase();
  if (title.includes("recorded")) return "recorded";
  if (title.includes("live")) return "live";
  if (title.includes("combo")) return "combo";

  return "standard";
};

const buildStableBatchId = (batch, index = 0) => {
  const rawId = String(batch?.id || batch?._id || "").trim();
  if (rawId) return rawId;

  const parts = [
    slugifyBatchPart(batch?.title),
    slugifyBatchPart(batch?.type),
    slugifyBatchPart(batch?.category),
    slugifyBatchPart(batch?.instructor),
    slugifyBatchPart(batch?.startDate),
    slugifyBatchPart(batch?.batchTime)
  ].filter(Boolean);

  return parts.length ? `${parts.join("-")}-${index}` : `batch-${index}`;
};

const getBatchDisplayText = (value, fallback = "") => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim() || fallback;
  }

  if (value && typeof value === "object") {
    const preferredValue = value.name || value.title || value.label || value.value;
    if (typeof preferredValue === "string" || typeof preferredValue === "number") {
      return String(preferredValue).trim() || fallback;
    }
  }

  return fallback;
};

const normalizeBatch = (batch, index = 0) => {
  const title = getBatchDisplayText(batch?.title, "Untitled Batch");
  const instructor = getBatchDisplayText(batch?.instructor, "BadamClasses");
  const category = getBatchDisplayText(batch?.category, "General");
  const duration = getBatchDisplayText(batch?.duration, "Flexible");
  const batchTime = getBatchDisplayText(batch?.batchTime);
  const startDate = getBatchDisplayText(batch?.startDate);
  const type = inferBatchType(batch);

  return {
    ...batch,
    id: buildStableBatchId({ ...batch, title, instructor, category, startDate, batchTime, type }, index),
    title,
    type,
    instructor,
    category,
    duration,
    batchTime,
    startDate,
    months: Number(batch?.months || 12),
    priceValue: Number(batch?.priceValue ?? batch?.price ?? 0),
    offerPrice:
      batch?.offerPrice === null || batch?.offerPrice === undefined || batch?.offerPrice === ""
        ? batch?.offerPrice
        : Number(batch.offerPrice),
    discountPercent:
      batch?.discountPercent === null || batch?.discountPercent === undefined || batch?.discountPercent === ""
        ? batch?.discountPercent
        : Number(batch.discountPercent),
    image: resolveCourseImage(batch)
  };
};

const getBatchCatalogKey = (batch = {}) => {
  const title = slugifyBatchPart(batch.title);
  // The title is the shared identity between an admin-created batch and an
  // older bundled fallback record. Categories can differ across those sources.
  return title || String(batch.id || batch._id || "").trim();
};

const dedupeBatchesById = (items = []) => {
  const seen = new Set();
  return items.filter((batch) => {
    // Remote/admin batches are deliberately merged first. Matching fixture data
    // must not replace an admin-updated title, price, or banner.
    const key = getBatchCatalogKey(batch);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const getBatchTimestamp = (batch = {}) => {
  const candidates = [batch.createdAt, batch.updatedAt, batch.startDate];
  for (const value of candidates) {
    const timestamp = Date.parse(value || "");
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
};

const sortLatestBatches = (items = []) => {
  return [...items].sort((a, b) => {
    const timestampDiff = getBatchTimestamp(b) - getBatchTimestamp(a);
    if (timestampDiff !== 0) return timestampDiff;
    if (b.isLatest !== a.isLatest) return b.isLatest ? 1 : -1;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
};

const shouldShowOnHomePage = (batch) => batch?.isActive !== false && batch?.status !== "hidden" && batch?.status !== "draft";

const stats = [];
const examResultStats = [];

const liveClassHighlights = [
  { label: "LIVE", title: "Daily Maths + Reasoning", teacher: "Badam Sir", time: "08:00 AM", status: "Live support + replay" },
  { label: "UPCOMING", title: "Railway Foundation Practice", teacher: "Badam Sir", time: "12:00 PM", status: "Class PDF included" },
  { label: "SAVED", title: "Arithmetic Revision Replay", teacher: "Badam Sir", time: "Recorded", status: "Previous live saved" }
];

const homepageMockTests = mockExamCategories.slice(0, 3);

const homepageIconTabs = [
  {
    label: "Class PDFs",
    href: "/class-pdfs",
    cardClass: "border-cyan-300/18 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.30),transparent_42%),linear-gradient(180deg,rgba(13,26,58,0.96),rgba(8,17,39,0.98))]",
    iconClass: "bg-teal-600 text-white shadow-[0_0_34px_rgba(20,184,166,0.34)]",
    glowClass: "bg-cyan-300/12",
    icon: (
      <svg viewBox="0 0 64 64" className="h-12 w-12" fill="none" aria-hidden="true">
        <path d="M18 7h20l8 8v34H18V7Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
        <path d="M38 7v10h8M25 28h14M25 36h14" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    label: "Live Batches",
    href: "/batches?mode=live",
    cardClass: "border-orange-300/24 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.28),transparent_44%),linear-gradient(180deg,rgba(23,16,36,0.96),rgba(8,17,39,0.98))]",
    iconClass: "bg-orange-500 text-white shadow-[0_0_34px_rgba(249,115,22,0.34)]",
    glowClass: "bg-orange-300/14",
    icon: (
      <svg viewBox="0 0 64 64" className="h-12 w-12" fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="5" fill="currentColor" />
        <path d="M22 24a13 13 0 0 0 0 16M42 24a13 13 0 0 1 0 16" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M14 17a24 24 0 0 0 0 30M50 17a24 24 0 0 1 0 30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    label: "Recorded Batches",
    href: "/batches?mode=recorded",
    cardClass: "border-sky-300/18 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.30),transparent_42%),linear-gradient(180deg,rgba(13,26,58,0.96),rgba(8,17,39,0.98))]",
    iconClass: "bg-sky-500 text-white shadow-[0_0_34px_rgba(14,165,233,0.34)]",
    glowClass: "bg-sky-300/12",
    icon: (
      <svg viewBox="0 0 64 64" className="h-12 w-12" fill="none" aria-hidden="true">
        <path d="M12 16h40v28H12z" stroke="currentColor" strokeWidth="5" />
        <path d="M28 24l13 7-13 8V24z" fill="currentColor" />
        <path d="M24 54h16M32 44v10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    label: "AI Test",
    href: "/mock-tests",
    cardClass: "border-amber-300/22 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.30),transparent_42%),linear-gradient(180deg,rgba(13,26,58,0.96),rgba(8,17,39,0.98))]",
    iconClass: "bg-amber-400 text-white shadow-[0_0_34px_rgba(245,158,11,0.34)]",
    glowClass: "bg-amber-300/12",
    icon: (
      <svg viewBox="0 0 64 64" className="h-12 w-12" fill="none" aria-hidden="true">
        <path d="M14 46V31M28 46V24M42 46V35" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M14 27l14-12 13 11 10-14" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M43 12h8v8" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
];

const appFeatureList = [
  "Live and recorded classes",
  "PDF notes and downloads",
  "Mock tests with performance review",
  "Notifications for upcoming classes"
];

const featureIconMap = {
  live: (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-orange-300" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="11" height="10" rx="2" />
      <path d="M14 10l6-3v10l-6-3z" />
    </svg>
  ),
  recorded: (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-orange-300" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8l6 4-6 4z" fill="currentColor" stroke="none" />
    </svg>
  ),
  daily: (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-orange-300" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 4h6" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  pdf: (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-orange-300" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  ),
  doubt: (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-orange-300" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 1 1-3.29-6.47" />
      <path d="M9 10a3 3 0 0 1 6 0c0 2-3 2-3 4" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-orange-300" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 15v-4" />
      <path d="M12 15v-8" />
      <path d="M17 15v-2" />
    </svg>
  )
};

const examIconMap = {
  "ssc-cgl": (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-200" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h10a2 2 0 0 1 2 2v14H6a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z" />
      <path d="M6 3v16" />
    </svg>
  ),
  "ssc-chsl": (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-200" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2z" />
      <path d="M20 5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2z" />
    </svg>
  ),
  "railway-ntpc": (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-200" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8" />
      <path d="M4 15h16" />
      <circle cx="8" cy="18" r="2" />
      <circle cx="16" cy="18" r="2" />
    </svg>
  ),
  "railway-alp": (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-200" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4v16" />
      <path d="M18 4v16" />
      <path d="M6 8h12" />
      <path d="M6 12h12" />
      <path d="M6 16h12" />
    </svg>
  ),
  banking: (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-200" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h18" />
      <path d="M5 10v8" />
      <path d="M9 10v8" />
      <path d="M15 10v8" />
      <path d="M19 10v8" />
      <path d="M12 4l9 6H3z" />
    </svg>
  ),
  "state-exams": (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-orange-200" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 20h14" />
      <path d="M7 20V9h10v11" />
      <path d="M12 3a4 4 0 0 1 4 4v2H8V7a4 4 0 0 1 4-4z" />
    </svg>
  )
};
export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [activePromoBanner, setActivePromoBanner] = useState(0);
  const [userName, setUserName] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [maxPrice, setMaxPrice] = useState(5000);
  const [maxMonths, setMaxMonths] = useState(12);
  const [localBatches, setLocalBatches] = useState([]);
  const [notice, setNotice] = useState(null);
  const [showOfferPopup, setShowOfferPopup] = useState(false);
  const [offerBanner, setOfferBanner] = useState(null);
  const [showAdmissionPopup, setShowAdmissionPopup] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({ name: "", email: "", mobile: "", exam: "" });
  const [admissionStatus, setAdmissionStatus] = useState("");
  const [remoteContent, setRemoteContent] = useState(null);
  const [remoteBatches, setRemoteBatches] = useState([]);
  const [deletedCourseKeys, setDeletedCourseKeys] = useState([]);
  const [sliderConfig, setSliderConfig] = useState({
    order: [],
    hidden: [],
    pinned: null,
    liveNow: [],
    liveUntil: {},
    autoLive: [],
    autoWindowMinutes: 120,
    manualLiveMinutes: 120
  });

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
      setDeletedCourseKeys(readDeletedCourseKeys());
    });
  }, []);

  useEffect(() => {
    if (!mounted) return undefined;
    if (window.matchMedia("(max-width: 768px)").matches) return undefined;
    let interval;
    const initialDelay = window.setTimeout(() => {
      setActivePromoBanner((current) => (current + 1) % homepagePrimaryBanners.length);
      interval = window.setInterval(() => {
        setActivePromoBanner((current) => (current + 1) % homepagePrimaryBanners.length);
      }, 8000);
    }, 10000);

    return () => {
      window.clearTimeout(initialDelay);
      if (interval) window.clearInterval(interval);
    };
  }, [mounted]);

  useEffect(() => {
    const user = getUser();
    if (user?.name) {
      setUserName(user.name.split(" ")[0]);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NOTICE_KEY);
      if (raw) setNotice(JSON.parse(raw));
    } catch {
      setNotice(null);
    }
  }, []);

  useEffect(() => {
    setOfferBanner(getOfferBanner());
  }, []);

  useEffect(() => {
    let active = true;

    const loadRemoteBatches = async () => {
      try {
        const coursesUrl = getPublicApiUrl("/courses");
        if (!coursesUrl) return;

        const response = await fetch(coursesUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("Courses could not be loaded");

        const data = await response.json();
        if (active) {
          startTransition(() => {
            setRemoteBatches(Array.isArray(data) ? data : []);
          });
        }
      } catch {
        if (active) {
          startTransition(() => setRemoteBatches([]));
        }
      }
    };

    loadRemoteBatches();
    const refreshTimer = window.setInterval(loadRemoteBatches, 60000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return undefined;
    const popupConfig = remoteContent?.enquiryPopup;
    if (popupConfig?.enabled !== true) {
      setShowAdmissionPopup(false);
      return undefined;
    }

    const isMobileBrowser = window.matchMedia("(max-width: 767px)").matches;
    const isInstalledApp = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (!isMobileBrowser || isInstalledApp) return undefined;

    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(ADMISSION_POPUP_DISMISSED_KEY) === "1";
    } catch {
      dismissed = false;
    }

    if (dismissed) return undefined;

    const delaySeconds = Math.min(30, Math.max(3, Number(popupConfig?.delaySeconds ?? 3) || 3));
    const timer = window.setTimeout(() => setShowAdmissionPopup(true), delaySeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [mounted, remoteContent?.enquiryPopup]);

  useEffect(() => {
    let active = true;

    const loadPublishedContent = async () => {
      try {
        const publicContentUrl = getPublicApiUrl("/automation/public-content");

        if (!publicContentUrl) {
          return;
        }

        const response = await fetch(publicContentUrl, {
          cache: "no-store"
        });
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (active) {
          startTransition(() => {
            setRemoteContent(data?.content || null);
          });
        }
      } catch {
        if (active) {
          startTransition(() => setRemoteContent(null));
        }
      }
    };

    loadPublishedContent();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const locals = filterDeletedCoursesFromStorage(readLocalCourses()).map((course) => ({
      id: course._id || course.id,
      _id: course._id,
      title: course.title,
      instructor: course.instructor || "BadamClasses",
      duration: course.duration || "Flexible",
      months: course.months || 12,
      category: course.category || "General",
      priceValue: Number(course.price || 0),
      image: resolveCourseImage(course),
      offerPrice: course.offerPrice,
      discountPercent: course.discountPercent,
      offerLabel: course.offerLabel,
      batchTime: course.batchTime,
      startDate: course.startDate,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      liveClassEnabled: Boolean(course.liveClassEnabled),
      liveClassUrl: course.liveClassUrl,
      isLatest: true
    }));
    startTransition(() => setLocalBatches(locals));
  }, []);

  const allBatches = useMemo(() => {
    const visibleFixtures = filterDeletedCourses(batches, deletedCourseKeys);
    const merged = [...remoteBatches, ...localBatches, ...visibleFixtures];
    return sortLatestBatches(dedupeBatchesById(merged.map((batch, index) => normalizeBatch(batch, index))));
  }, [deletedCourseKeys, localBatches, remoteBatches]);

  const safeBatches = useMemo(() => allBatches.filter(shouldShowOnHomePage), [allBatches]);

  const comparisonBatches = useMemo(() => {
    return allBatches;
  }, [allBatches]);

  const displayBatches = useMemo(() => {
    return applySliderConfig(safeBatches, sliderConfig);
  }, [safeBatches, sliderConfig]);

  const finalBatches = useMemo(() => {
    return displayBatches.filter((b) => {
      const q = query.trim().toLowerCase();
      const matchQ = !q || b.title.toLowerCase().includes(q) || b.instructor.toLowerCase().includes(q);
      const matchC = category === "All" || b.category === category;
      const matchP = b.priceValue <= maxPrice;
      const matchD = b.months <= maxMonths;
      return matchQ && matchC && matchP && matchD;
    }).slice(0, 6);
  }, [query, category, maxPrice, maxMonths, displayBatches]);

  useEffect(() => {
    const hasDiscount = safeBatches.some((b) => b.discountPercent || b.offerLabel || (b.offerPrice && b.offerPrice < b.priceValue));
    const dismissed = typeof window !== "undefined" ? localStorage.getItem("bsc_offer_dismissed") : "1";
    if (hasDiscount && dismissed !== "1") {
      setShowOfferPopup(true);
    }
  }, [safeBatches]);

  useEffect(() => {
    let cfg = getSliderConfig();
    const pruned = pruneExpiredLiveNow(cfg);
    if (pruned !== cfg && typeof window !== "undefined") {
      window.localStorage.setItem("badamclasses_slider_config", JSON.stringify(pruned));
      cfg = pruned;
    }
    startTransition(() => setSliderConfig(cfg));
  }, [safeBatches]);
  const closeAdmissionPopup = () => {
    setShowAdmissionPopup(false);
    try {
      window.sessionStorage.setItem(ADMISSION_POPUP_DISMISSED_KEY, "1");
    } catch {
      // Keep the popup dismissible when browser storage is unavailable.
    }
  };

  const handleAdmissionSubmit = (event) => {
    event.preventDefault();
    const cleaned = {
      name: admissionForm.name.trim(),
      email: admissionForm.email.trim(),
      mobile: admissionForm.mobile.trim(),
      exam: admissionForm.exam
    };

    if (!cleaned.name || !cleaned.email || !cleaned.mobile || !cleaned.exam) {
      setAdmissionStatus("Please fill all fields to send your enquiry.");
      return;
    }

    try {
      const existing = JSON.parse(window.localStorage.getItem("badamclasses_admission_leads") || "[]");
      const leads = Array.isArray(existing) ? existing : [];
      window.localStorage.setItem(
        "badamclasses_admission_leads",
        JSON.stringify([...leads, { ...cleaned, createdAt: new Date().toISOString(), source: "homepage-popup" }])
      );
    } catch {
      // Local fallback is best-effort; the confirmation still keeps the form usable offline.
    }

    setAdmissionStatus("Thanks! Our team will contact you shortly.");
  };

  const categories = ["All", ...Array.from(new Set(safeBatches.map((b) => b.category)))];
  const publishedNotice = remoteContent?.notice;
  const publishedOfferBanner = remoteContent?.offerBanner;
  const publishedBanner = remoteContent?.banner;
  const enquiryPopup = remoteContent?.enquiryPopup;
  const offerBannerImage = resolveBannerImage(publishedOfferBanner?.image || offerBanner?.image, HOMEPAGE_BANNER_FALLBACKS.offer);
  const heroBannerImage = resolveBannerImage(publishedBanner?.image, HOMEPAGE_BANNER_FALLBACKS.legacyBatch);
  const canRenderLiveBadges = mounted;

  return (
    <main className="homepage-main mx-auto w-[94%] max-w-7xl py-10 text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <span className="cinematic-orb cinematic-orb-1" />
        <span className="cinematic-orb cinematic-orb-2" />
        <span className="cinematic-orb cinematic-orb-3" />
      </div>
      <div className="grain-overlay" />

      {userName ? (
        <div className="animate-reveal stagger-1 mb-4 flex justify-center">
          <div className="inline-flex flex-col gap-1 rounded-full border border-orange-300/30 bg-orange-500/10 px-5 py-2 text-sm text-orange-200">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-300" />
              Namaste {userName}, BadamClasses mein aapka swagat hai.
            </span>
            <span className="text-[12px] text-orange-100/80">Latest batches, live classes aur study resources aapke dashboard par available hain.</span>
          </div>
        </div>
      ) : null}

      {publishedNotice?.title || publishedNotice?.message || notice?.title || notice?.message ? (
        <div className="animate-reveal mb-4 rounded-2xl border border-orange-300/40 bg-orange-500/10 px-5 py-3 text-sm text-orange-100">
          <p className="font-semibold">{publishedNotice?.title || notice?.title}</p>
          <p className="text-xs text-orange-100/80">{publishedNotice?.message || notice?.message}</p>
        </div>
      ) : null}

      <section className="mb-10 overflow-hidden rounded-2xl" aria-label="Badam Singh Classes featured banners">
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activePromoBanner * 100}%)` }}>
            {homepagePrimaryBanners.map((banner, index) => (
              <div key={banner.id} className="min-w-full">
                <div className="new-batch-hero">
                  <div className="new-batch-hero-frame">
                    <Image
                      src={banner.image}
                      alt={banner.alt}
                      width={2172}
                      height={724}
                      sizes="(max-width: 768px) 94vw, 1280px"
                      priority={index === 0}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      unoptimized
                      className="new-batch-hero-image"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = banner.fallback;
                      }}
                    />
                    <a href={banner.enrollHref} className={`new-batch-hotspot ${banner.hotspotClass || "new-batch-hotspot-enroll"}`} aria-label={`Enroll from ${banner.label}`} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="animate-reveal mb-12 grid items-center gap-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c1f48] via-[#0b1634] to-[#08122b] p-6 shadow-glow md:grid-cols-2 md:p-10">
        <div>
          <p className="mb-3 inline-block rounded-full border border-orange-300/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-200">India's Trusted Online Exam Prep Platform</p>
          <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">{publishedBanner?.title || "Prepare Smarter with BadamClasses"}</h1>
          <p className="mt-4 max-w-2xl text-slate-300">{publishedBanner?.subtitle || "Join India's growing learning platform for SSC, Railway, Police, Teaching and other competitive exams."}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={publishedBanner?.ctaHref || "/batches"} className="btn-gradient btn-anim w-full rounded-xl px-5 py-3 text-center font-semibold text-white sm:w-auto">{publishedBanner?.ctaLabel || "Start Learning"}</Link>
            <Link href="/batches" className="btn-anim w-full rounded-xl border border-white/20 px-5 py-3 text-center font-semibold text-slate-100 transition hover:border-orange-300 sm:w-auto">View Batches</Link>
          </div>
        </div>

        <div className="relative">
          <Image
            src={heroBannerImage}
            alt="Students learning"
            width={1536}
            height={1024}
            sizes="(max-width: 768px) 92vw, 50vw"
            unoptimized={/^https?:\/\//i.test(heroBannerImage)}
            className="cinematic-zoom float-soft homepage-hero-image h-auto max-h-[70svh] w-full rounded-2xl bg-[#08122b] object-contain md:h-96"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = HOMEPAGE_BANNER_FALLBACKS.hero;
            }}
          />
          <span className="floating-chip chip-a">SSC</span>
          <span className="floating-chip chip-b">Railway</span>
          <span className="floating-chip chip-c">Teaching</span>
          <div className="absolute -bottom-4 left-4 rounded-xl border border-orange-300/40 bg-[#0c1f48]/90 px-4 py-2 text-sm text-orange-200">Live + Recorded + Mock Tests</div>
        </div>
      </section>

      <nav className="animate-reveal mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Homepage quick tabs">
        {homepageIconTabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`card-anim group relative flex min-h-[150px] flex-col items-center justify-center overflow-hidden rounded-2xl border px-5 py-5 text-center shadow-[0_22px_55px_rgba(2,6,23,0.32)] transition hover:-translate-y-1 hover:border-orange-300/38 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${tab.cardClass}`}
          >
            <span className={`pointer-events-none absolute -top-10 h-28 w-28 rounded-full blur-2xl ${tab.glowClass}`} aria-hidden="true" />
            <span className={`relative flex h-24 w-24 items-center justify-center rounded-full border border-white/20 ${tab.iconClass} transition group-hover:scale-105`}>
              {tab.icon}
            </span>
            <span className="relative mt-4 text-2xl font-semibold leading-tight text-white drop-shadow-[0_2px_10px_rgba(2,6,23,0.65)]">
              {tab.label}
            </span>
            <span className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      {showAdmissionPopup ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#020b1f]/80 px-4 py-6 backdrop-blur-sm">
          <section className="relative max-h-[calc(100vh-3rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-blue-300/75 bg-[#061a3d] shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_0_70px_rgba(37,99,235,0.35)]">
            <div className="flex items-center justify-between border-b border-blue-200/15 px-6 py-4 sm:px-8">
              <div className="h-12 w-52 overflow-hidden rounded-xl border border-blue-300/30 bg-[#07152f] shadow-[0_0_24px_rgba(37,99,235,0.25)]">
                <img src="/new-logo.webp" alt="Badam Singh Classes" className="h-full w-full object-cover object-center" />
              </div>
              <button
                type="button"
                onClick={closeAdmissionPopup}
                aria-label="Close admission popup"
                className="rounded-full border border-white/20 px-3 py-1 text-2xl leading-none text-slate-300 transition hover:border-orange-300/70 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <span className="inline-flex rounded-md border border-orange-300/60 bg-orange-500/10 px-3 py-1 text-xs font-bold tracking-[0.22em] text-orange-200">
                ADMISSION OPEN
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{enquiryPopup?.title || "Start your preparation with expert guidance"}</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-blue-100/75 sm:text-base">{enquiryPopup?.subtitle || "Share your details and our academic team will help you choose the right course."}</p>

              <form onSubmit={handleAdmissionSubmit} className="mt-6 grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-blue-50">
                  Full name
                  <input
                    type="text"
                    value={admissionForm.name}
                    onChange={(event) => setAdmissionForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="h-12 rounded-xl border border-blue-300/45 bg-[#071936] px-4 text-base font-normal text-white outline-none transition placeholder:text-blue-100/45 focus:border-blue-300 focus:ring-2 focus:ring-blue-400/25"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-blue-50">
                    Email address
                    <input
                      type="email"
                      value={admissionForm.email}
                      onChange={(event) => setAdmissionForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="h-12 rounded-xl border border-blue-300/45 bg-[#071936] px-4 text-base font-normal text-white outline-none transition placeholder:text-blue-100/45 focus:border-blue-300 focus:ring-2 focus:ring-blue-400/25"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-blue-50">
                    Mobile number
                    <input
                      type="tel"
                      value={admissionForm.mobile}
                      onChange={(event) => setAdmissionForm((current) => ({ ...current, mobile: event.target.value }))}
                      placeholder="Enter mobile number"
                      autoComplete="tel"
                      className="h-12 rounded-xl border border-blue-300/45 bg-[#071936] px-4 text-base font-normal text-white outline-none transition placeholder:text-blue-100/45 focus:border-blue-300 focus:ring-2 focus:ring-blue-400/25"
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-semibold text-blue-50">
                  Exam you are preparing for
                  <select
                    aria-label="Exam you are preparing for"
                    value={admissionForm.exam}
                    onChange={(event) => setAdmissionForm((current) => ({ ...current, exam: event.target.value }))}
                    className="h-12 rounded-xl border border-blue-300/45 bg-[#071936] px-4 text-base font-normal text-white outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-400/25"
                  >
                    <option value="" className="bg-[#071936]">Select an exam</option>
                    <option value="SSC CGL" className="bg-[#071936]">SSC CGL</option>
                    <option value="SSC CHSL" className="bg-[#071936]">SSC CHSL</option>
                    <option value="MP Police" className="bg-[#071936]">MP Police</option>
                    <option value="State Exam" className="bg-[#071936]">State Exam</option>
                  </select>
                </label>
                <button type="submit" className="mt-2 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-base font-bold text-[#081737] shadow-[0_12px_30px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 hover:from-orange-400 hover:to-amber-300">
                  {enquiryPopup?.buttonLabel || "Send enquiry"}
                </button>
                {admissionStatus ? <p className="text-center text-sm font-medium text-orange-200" role="status">{admissionStatus}</p> : null}
              </form>
            </div>
          </section>
        </div>
      ) : null}

      {showOfferPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-orange-300/40 bg-[#0b1634]/90 shadow-2xl">
            <button
              onClick={() => {
                setShowOfferPopup(false);
                localStorage.setItem("bsc_offer_dismissed", "1");
              }}
              className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/40 px-2 py-1 text-xs text-white"
            >
              Close
            </button>
            <img
              src={HOMEPAGE_BANNER_FALLBACKS.promo}
              alt="Special Offer"
              width="1536"
              height="1024"
              loading="lazy"
              decoding="async"
              className="h-auto w-full"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = HOMEPAGE_BANNER_FALLBACKS.hero;
              }}
            />
          </div>
        </div>
      ) : null}

      {(publishedOfferBanner?.enabled || offerBanner?.enabled) ? (
        <div className="animate-reveal mb-6 overflow-hidden rounded-2xl border border-orange-300/40 bg-orange-500/10">
          <div className="grid gap-4 p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
            {(publishedOfferBanner?.image || offerBanner?.image || offerBannerImage) ? (
              <img
                src={offerBannerImage}
                alt="Offer"
                width="1536"
                height="1024"
                loading="lazy"
                decoding="async"
                className="h-20 w-28 rounded-xl object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = HOMEPAGE_BANNER_FALLBACKS.offer;
                }}
              />
            ) : null}
            <div>
              <p className="font-semibold text-orange-100">{publishedOfferBanner?.title || offerBanner?.title || "Special Offer"}</p>
              <p className="text-xs text-orange-100/80">{publishedOfferBanner?.text || offerBanner?.text || "Limited time discount available."}</p>
            </div>
            {(publishedOfferBanner?.link || offerBanner?.link) ? (
              <Link href={publishedOfferBanner?.link || offerBanner?.link} className="btn-gradient btn-anim rounded-xl px-4 py-2 text-sm font-semibold text-white">
                View Offer
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <StatsCounter items={stats} />
      <div className="section-divider" />

      <section className="animate-reveal mb-10 rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-4 md:p-5">
        <h2 className="mb-4 font-display text-2xl font-semibold">Find Your Course Fast</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search batch or instructor" className="rounded-xl border border-white/10 bg-[#0b1634] px-3 py-2 text-sm outline-none" />
          <select aria-label="Filter courses by category" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b1634] px-3 py-2 text-sm outline-none">
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="rounded-xl border border-white/10 bg-[#0b1634] px-3 py-2 text-sm">Max Price: <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>{maxPrice}<input type="range" min="999" max="5000" step="100" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="mt-1 w-full" /></label>
          <label className="rounded-xl border border-white/10 bg-[#0b1634] px-3 py-2 text-sm">Max Duration: {maxMonths} mo<input type="range" min="6" max="12" step="1" value={maxMonths} onChange={(e) => setMaxMonths(Number(e.target.value))} className="mt-1 w-full" /></label>
        </div>
      </section>

      <section id="batches" className="animate-reveal stagger-2 mb-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-semibold">Featured Batches</h2>
          <Link href="/batches" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 transition hover:border-orange-300">View All Batches</Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {finalBatches.map((batch, idx) => (
            <article key={batch.id} className="card-anim card-tilt group overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,26,58,0.94),rgba(8,17,39,0.98))] shadow-[0_22px_50px_rgba(2,6,23,0.25)] transition hover:-translate-y-1.5 hover:border-orange-300/40 hover:shadow-[0_30px_70px_rgba(249,115,22,0.12)]">
              <div className="relative">
                <img
                  src={resolveCourseImage(batch)}
                  alt={batch.title}
                  width="1024"
                  height="1536"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getCourseFallbackImage(batch);
                  }}
                  className="aspect-[29/36] w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#081127] via-[#081127]/65 to-transparent" />
                {idx < 3 ? <span className="live-badge">LIVE</span> : null}
                {canRenderLiveBadges && isBatchLiveNow(batch, sliderConfig) ? (
                  <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-[0_0_14px_rgba(16,185,129,0.5)]">
                    Live Now
                  </span>
                ) : null}
                {batch.discountPercent ? (
                  <span className="absolute right-3 top-3 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                    {batch.offerLabel || `${batch.discountPercent}% OFF`}
                  </span>
                ) : null}
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                    {batch.category}
                  </span>
                  <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
                    {batch.type}
                  </span>
                </div>
                <span className="card-sheen" />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-xl leading-tight text-white">{batch.title}</h3>
                    <p className="mt-1 truncate text-sm text-slate-300">{batch.instructor}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-right">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Duration</p>
                    <p className="mt-1 text-sm font-semibold text-white">{batch.duration}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-[#081127] px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Starts</p>
                    <p className="mt-1 text-sm font-semibold text-white">{batch.startDate || "Soon"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#081127] px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Batch time</p>
                    <p className="mt-1 text-sm font-semibold text-white">{batch.batchTime || "Flexible"}</p>
                  </div>
                </div>
                {canRenderLiveBadges && isBatchLiveNow(batch, sliderConfig) ? (
                  <p className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">
                    Live ends in {getLiveCountdown(batch, sliderConfig)?.label || "—"}
                  </p>
                ) : null}
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-semibold text-orange-400">
                      <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
                      {batch.offerPrice ? Number(batch.offerPrice).toLocaleString("en-IN") : batch.priceValue.toLocaleString("en-IN")}
                    </p>
                    {batch.offerPrice && batch.offerPrice < batch.priceValue ? (
                      <p className="text-xs text-slate-400 line-through">
                        <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
                        {batch.priceValue.toLocaleString("en-IN")}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">Premium guided preparation</p>
                    )}
                  </div>
                  <Link href={`/courses/${encodeURIComponent(batch.id)}`} className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-cyan-300/40">
                    View Details
                  </Link>
                </div>
                <Link href={`/checkout?course=${encodeURIComponent(batch.title)}`} className="btn-gradient btn-anim mt-4 block w-full rounded-2xl px-4 py-3 text-center text-sm font-semibold text-white">Enroll Now</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="section-divider" />
      <section className="animate-reveal mb-14 rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
        <h2 className="mb-5 font-display text-3xl font-semibold">Batch Comparison</h2>
        <div className="comparison-scroll overflow-x-auto pb-3" tabIndex={0} aria-label="Scroll horizontally to compare batches">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-orange-300">
                <th className="py-2">Batch</th><th>Category</th><th>Duration</th><th>Price</th><th>Best For</th>
              </tr>
            </thead>
            <tbody>
              {comparisonBatches.map((b, i) => (
                <tr key={b.id} className={`border-b border-white/10 ${i === 2 ? "bg-orange-500/10" : ""}`}>
                  <td className="py-2">{b.title}</td><td>{b.category}</td><td>{b.duration}</td><td><span className="inr-sign">{String.fromCharCode(0x20B9)}</span>{b.priceValue.toLocaleString("en-IN")}</td><td>{i === 2 ? "Best Value" : "Focused Prep"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="animate-reveal stagger-2 mb-14">
        <h2 className="mb-6 font-display text-3xl font-semibold">Why Choose BadamClasses</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="card-anim rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5 transition hover:border-orange-300/40">
              <div className="inline-flex items-center justify-center rounded-xl border border-orange-300/30 bg-orange-400/10 p-2">{featureIconMap[feature.icon] ?? feature.icon}</div>
              <h3 className="mt-2 font-display text-xl">{feature.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="live-classes" className="animate-reveal stagger-2 mb-14 rounded-3xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(6,78,59,0.26),rgba(13,26,58,0.82))] p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">Live Classes</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-white">Today&apos;s Learning Schedule</h2>
          </div>
          <Link href="/dashboard" className="rounded-xl border border-emerald-300/35 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100">
            Open Dashboard
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {liveClassHighlights.map((item) => (
            <article key={item.title} className="rounded-2xl border border-white/10 bg-[#071126]/70 p-4">
              <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${item.label === "LIVE" ? "bg-red-500 text-white" : "border border-white/15 text-slate-200"}`}>
                {item.label}
              </span>
              <h3 className="mt-4 font-display text-xl text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{item.teacher} | {item.time}</p>
              <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-emerald-100">{item.status}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="mock-tests" className="animate-reveal stagger-2 mb-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Exam Pattern Based</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">Free & Paid Mock Tests</h2>
          </div>
          <Link href="/mock-tests" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-orange-300">
            View All Tests
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {homepageMockTests.map((test) => (
            <article key={test.exam} className="card-anim rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5 transition hover:border-orange-300/40">
              <p className="text-xs uppercase tracking-[0.22em] text-orange-300">{test.exam}</p>
              <h3 className="mt-3 font-display text-2xl text-white">{test.totalTests} Mock Tests</h3>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">Free: {test.freeTests}</span>
                <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">Paid: {test.paidTests}</span>
                <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">Time: {test.duration}</span>
                <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">Level: {test.difficulty}</span>
              </div>
              <p className="mt-3 text-xs text-slate-400">{test.pattern} | {test.sections}</p>
              <Link href="/mock-tests" className="btn-gradient btn-anim mt-5 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white">
                Start Practice
              </Link>
            </article>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {exams.map((exam) => (
            <div key={exam.label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d1a3a]/55 p-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-orange-300/30 bg-orange-400/10">{examIconMap[exam.icon] ?? exam.icon}</span>
              <p className="text-sm font-semibold text-slate-100">{exam.label}</p>
            </div>
          ))}
        </div>
      </section>

      <CurrentAffairsSection />

      <section id="results" className="animate-reveal mb-14 rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
        <h2 className="mb-4 font-display text-3xl font-semibold">Exam Results Snapshot</h2>
        <StatsCounter items={examResultStats} />
      </section>

      <section className="animate-reveal mb-14 rounded-2xl border border-white/10 bg-[#0d1a3a]/70 p-5">
        <h2 className="mb-5 font-display text-3xl font-semibold">FAQ</h2>
        <div className="space-y-3">
          {faqs.map((item) => (
            <details key={item.q} className="group rounded-xl border border-white/10 bg-[#0b1634]/70 p-4">
              <summary className="cursor-pointer list-none font-semibold text-slate-100">
                <span className="mr-2 text-orange-300 group-open:hidden">+</span>
                <span className="mr-2 hidden text-orange-300 group-open:inline">-</span>
                {item.q}
              </summary>
              <p className="mt-2 text-sm text-slate-300">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <TestimonialsCarousel items={remoteContent?.successStories?.length ? remoteContent.successStories : testimonials} />

      <section className="animate-reveal stagger-3 mb-10 rounded-3xl border border-orange-300/30 bg-gradient-to-r from-[#10224e] to-[#1a2b57] p-6 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">Mobile App</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">Study Anytime Anywhere with the BadamClasses App</h2>
        <p className="mt-2 text-slate-300">Access live classes, recorded lectures, quizzes, and notes directly from your mobile app.</p>
        <div className="mt-6 grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap gap-3">
              <span className="btn-gradient rounded-xl px-5 py-3 font-semibold text-white">Android Coming Soon</span>
              <span className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-slate-100">iOS Coming Soon</span>
            </div>
            <ul className="mt-5 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
              {appFeatureList.map((item) => (
                <li key={item} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">{item}</li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-[auto_auto] sm:items-center">
            <div className="rounded-2xl border border-white/15 bg-white p-4 text-center text-slate-950">
              <div className="grid h-28 w-28 grid-cols-4 gap-1">
                {Array.from({ length: 16 }).map((_, index) => (
                  <span key={index} className={`${index % 3 === 0 ? "bg-slate-950" : "bg-slate-300"}`} />
                ))}
              </div>
              <p className="mt-2 text-xs font-bold">QR Soon</p>
            </div>
            <div className="phone-mock">
              <div className="phone-screen">
                <img src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=700&q=80" alt="App Preview" className="h-full w-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="animate-reveal stagger-4 mb-10 rounded-3xl border border-white/10 bg-[#0d1a3a]/80 p-8 text-center">
        <h2 className="font-display text-3xl font-semibold">Certificate Preview</h2>
        <p className="mx-auto mt-2 max-w-2xl text-slate-300">Get a completion certificate after finishing your batch and tests.</p>
        <div className="certificate-shine mx-auto mt-5 max-w-3xl rounded-2xl border border-orange-300/35 bg-gradient-to-br from-[#132c5f] to-[#0c1a3d] p-8 text-left">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-300">BadamClasses</p>
          <h3 className="mt-2 font-display text-3xl text-white">Certificate of Achievement</h3>
          <p className="mt-2 text-slate-200">Awarded for outstanding performance in competitive exam preparation.</p>
        </div>
        <div className="mt-5 flex justify-center gap-3">
          <button className="btn-gradient btn-anim rounded-xl px-5 py-3 font-semibold text-white">Join Batch</button>
          <Link href="/courses" className="btn-anim rounded-xl border border-white/20 px-5 py-3 font-semibold text-slate-100 transition hover:border-orange-300">Explore Courses</Link>
        </div>
      </section>

      <section id="contact" className="animate-reveal mb-12 rounded-3xl border border-white/10 bg-[#0d1a3a]/70 p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold">Contact & Support</h2>
            <p className="mt-2 text-slate-300">Need help choosing a batch or facing login issues? Our support team is ready.</p>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              {siteContact.email ? <p>Support Email: <span className="text-orange-200">{siteContact.email}</span></p> : null}
              {siteContact.whatsappDisplay ? <p>WhatsApp Helpline: <span className="text-orange-200">{siteContact.whatsappDisplay}</span></p> : null}
              <p>Office Hours: <span className="text-orange-200">7 AM - 10 PM (IST)</span></p>
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#0b1634]/80 p-4">
            <p className="text-sm text-slate-300">Send us a quick message</p>
            <input placeholder="Name" className="rounded-lg border border-white/10 bg-[#091127] px-3 py-2 text-sm text-white outline-none" />
            <input placeholder="Email" className="rounded-lg border border-white/10 bg-[#091127] px-3 py-2 text-sm text-white outline-none" />
            <textarea placeholder="How can we help you?" rows="3" className="rounded-lg border border-white/10 bg-[#091127] px-3 py-2 text-sm text-white outline-none" />
            <button className="btn-gradient btn-anim rounded-lg px-4 py-2 text-sm font-semibold text-white">Submit Query</button>
          </div>
        </div>
      </section>
    </main>
  );
}




