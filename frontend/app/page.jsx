"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatsCounter from "@/components/StatsCounter";
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
const MEGA_TEST_REGISTRATION_KEY = "badamclasses_mega_test_registrations";
const megaTestDetails = {
  title: "Mega Test 3.0",
  exam: "SSC CGL Exam Topper Batch",
  startsOn: "10 May",
  timing: "08:00 AM to 10:00 AM"
};

const normalizeIndianPhone = (value = "") => {
  const digits = String(value || "").replace(/\D+/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
};

const buildWhatsappConfirmationUrl = ({ name, phone, exam }) => {
  const whatsappPhone = normalizeIndianPhone(phone);
  const studentName = String(name || "Student").trim();
  const message = [
    `Hi ${studentName}, your Badam Singh Classes Mega Test 3.0 registration is received.`,
    `Exam: ${exam || megaTestDetails.exam}.`,
    `Date: ${megaTestDetails.startsOn}.`,
    `Timing: ${megaTestDetails.timing}.`,
    "Please reach the test link or center on time."
  ].join(" ");

  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
};

const HOMEPAGE_BANNER_FALLBACKS = {
  newBatch: "/railway-batch-banner-2026.png",
  legacyBatch: "/new-batch-starts-2026.png",
  megaTest: "/mega-test-3-banner.png",
  promo: "/new-batch-starts-2026.png",
  hero: "/ssc-complete.jpg",
  offer: "/railway-batch-banner-2026.png"
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
    id: "legacy-batch",
    image: HOMEPAGE_BANNER_FALLBACKS.legacyBatch,
    fallback: HOMEPAGE_BANNER_FALLBACKS.hero,
    alt: "Badam Singh Classes new batch starts",
    label: "Featured SSC Batch",
    exploreHref: "/courses",
    mockHref: "/mock-tests",
    enrollHref: "/courses"
  },
  {
    id: "railway-batch",
    image: HOMEPAGE_BANNER_FALLBACKS.newBatch,
    fallback: HOMEPAGE_BANNER_FALLBACKS.legacyBatch,
    alt: "Badam Singh Classes Railway Batch",
    label: "Featured Railway Batch",
    exploreHref: "/batches?search=railway",
    mockHref: "/batches?search=railway",
    enrollHref: "/batches?search=railway"
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

const normalizeBatch = (batch, index = 0) => {
  const title = String(batch?.title || "Untitled Batch").trim();
  const instructor = String(batch?.instructor || "BadamClasses").trim();
  const category = String(batch?.category || "General").trim();
  const duration = String(batch?.duration || "Flexible").trim();
  const batchTime = String(batch?.batchTime || "").trim();
  const startDate = String(batch?.startDate || "").trim();
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

const dedupeBatchesById = (items = []) => {
  const seen = new Set();
  return items.filter((batch) => {
    const key = String(batch?.id || "").trim();
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

const shouldShowOnHomePage = (batch) => {
  if (Array.isArray(batch?.classSections) && batch.classSections.length > 0) {
    return false;
  }

  return true;
};

const stats = [
  { value: 50000, label: "Students", suffix: "+" },
  { value: 100, label: "Courses", suffix: "+" },
  { value: 500, label: "Practice Tests", suffix: "+" },
  { value: 1000, label: "Video Lectures", suffix: "+" },
  { value: 12, label: "Live Classes Today", suffix: "" },
  { value: 95, label: "Success Rate", suffix: "%" }
];

const examResultStats = [
  { value: 4200, label: "Selections", suffix: "+" },
  { value: 980, label: "Top Ranks", suffix: "+" },
  { value: 88, label: "Success Rate", suffix: "%" },
  { value: 36, label: "State Toppers", suffix: "" }
];

const liveClassHighlights = [
  { label: "LIVE", title: "Daily Maths + Reasoning", teacher: "Badam Sir", time: "08:00 AM", status: "Live support + replay" },
  { label: "UPCOMING", title: "Railway Foundation Practice", teacher: "Badam Sir", time: "12:00 PM", status: "Class PDF included" },
  { label: "SAVED", title: "Arithmetic Revision Replay", teacher: "Badam Sir", time: "Recorded", status: "Previous live saved" }
];

const homepageMockTests = mockExamCategories.slice(0, 3);

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
  const [remoteContent, setRemoteContent] = useState(null);
  const [deletedCourseKeys, setDeletedCourseKeys] = useState([]);
  const [registrationForm, setRegistrationForm] = useState({
    name: "",
    phone: "",
    exam: "SSC CGL",
    city: ""
  });
  const [registrationNotice, setRegistrationNotice] = useState("");
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
    setMounted(true);
    setDeletedCourseKeys(readDeletedCourseKeys());
  }, []);

  useEffect(() => {
    if (!mounted) return undefined;
    const timer = window.setInterval(() => {
      setActivePromoBanner((current) => (current + 1) % homepagePrimaryBanners.length);
    }, 4200);

    return () => window.clearInterval(timer);
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
          setRemoteContent(data?.content || null);
        }
      } catch {
        if (active) {
          setRemoteContent(null);
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
    setLocalBatches(locals);
  }, []);

  const safeBatches = useMemo(() => {
    const visibleFixtures = filterDeletedCourses(batches, deletedCourseKeys);
    const merged = localBatches.length ? [...localBatches, ...visibleFixtures] : visibleFixtures;
    return sortLatestBatches(dedupeBatchesById(merged.map((batch, index) => normalizeBatch(batch, index))).filter(shouldShowOnHomePage));
  }, [deletedCourseKeys, localBatches]);

  const comparisonBatches = useMemo(() => {
    return safeBatches.slice(0, 5);
  }, [safeBatches]);

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
    setSliderConfig(cfg);
  }, [safeBatches]);
  const categories = ["All", ...Array.from(new Set(safeBatches.map((b) => b.category)))];
  const publishedNotice = remoteContent?.notice;
  const publishedOfferBanner = remoteContent?.offerBanner;
  const publishedBanner = remoteContent?.banner;
  const offerBannerImage = resolveBannerImage(publishedOfferBanner?.image || offerBanner?.image, HOMEPAGE_BANNER_FALLBACKS.offer);
  const heroBannerImage = resolveBannerImage(publishedBanner?.image, HOMEPAGE_BANNER_FALLBACKS.legacyBatch);
  const canRenderLiveBadges = mounted;

  const updateRegistrationForm = (key, value) => {
    setRegistrationForm((current) => ({ ...current, [key]: value }));
  };

  const submitMegaTestRegistration = (event) => {
    event.preventDefault();
    const name = registrationForm.name.trim();
    const phone = normalizeIndianPhone(registrationForm.phone);

    if (!name || phone.length < 12) {
      setRegistrationNotice("Name aur valid 10 digit WhatsApp number required hai.");
      return;
    }

    const record = {
      ...registrationForm,
      name,
      phone,
      createdAt: new Date().toISOString(),
      test: megaTestDetails.title
    };

    try {
      const existing = JSON.parse(window.localStorage.getItem(MEGA_TEST_REGISTRATION_KEY) || "[]");
      const registrations = Array.isArray(existing) ? existing : [];
      window.localStorage.setItem(MEGA_TEST_REGISTRATION_KEY, JSON.stringify([record, ...registrations].slice(0, 200)));
    } catch {
      // Registration should still proceed to WhatsApp even if local storage is unavailable.
    }

    setRegistrationNotice("Registration saved. WhatsApp confirmation draft open ho raha hai.");
    window.open(buildWhatsappConfirmationUrl(record), "_blank", "noopener,noreferrer");
    setRegistrationForm({ name: "", phone: "", exam: "SSC CGL", city: "" });
  };

  return (
    <main className="mx-auto w-[94%] max-w-7xl py-10 text-slate-100">
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
              Namaste {userName}, apka BadamClasses me suagat hai.
            </span>
            <span className="text-[12px] text-orange-100/80">Aapke liye nayi batches aur classes ready hain.</span>
          </div>
        </div>
      ) : null}

      {publishedNotice?.title || publishedNotice?.message || notice?.title || notice?.message ? (
        <div className="animate-reveal mb-4 rounded-2xl border border-orange-300/40 bg-orange-500/10 px-5 py-3 text-sm text-orange-100">
          <p className="font-semibold">{publishedNotice?.title || notice?.title}</p>
          <p className="text-xs text-orange-100/80">{publishedNotice?.message || notice?.message}</p>
        </div>
      ) : null}

      <section className="mb-10 overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,17,39,0.94),rgba(4,9,22,0.98))] p-2 shadow-[0_28px_80px_rgba(2,6,23,0.38)]" aria-label="Badam Singh Classes featured banners">
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activePromoBanner * 100}%)` }}>
            {homepagePrimaryBanners.map((banner, index) => (
              <div key={banner.id} className="min-w-full">
                <div className="new-batch-hero">
                  <div className="new-batch-hero-frame">
                    <img
                      src={banner.image}
                      alt={banner.alt}
                      className="new-batch-hero-image min-h-[260px] md:min-h-[360px] xl:min-h-[460px]"
                      loading={index === 0 ? "eager" : "lazy"}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = banner.fallback;
                      }}
                    />
                    <a href={banner.exploreHref} className="new-batch-hotspot new-batch-hotspot-explore" aria-label={`Explore ${banner.label}`} />
                    <a href={banner.mockHref} className="new-batch-hotspot new-batch-hotspot-mock" aria-label={`Open ${banner.label}`} />
                    <a href={banner.enrollHref} className="new-batch-hotspot new-batch-hotspot-enroll" aria-label={`Enroll from ${banner.label}`} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="animate-reveal mb-12 grid gap-5 overflow-hidden rounded-3xl border border-white/10 bg-[#071126] p-3 shadow-glow lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:p-5">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1634]">
          <img
            src={HOMEPAGE_BANNER_FALLBACKS.megaTest}
            alt="Badam Singh Classes Mega Test 3.0 for SSC CGL"
            className="h-full min-h-[360px] w-full object-cover object-top"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = HOMEPAGE_BANNER_FALLBACKS.hero;
            }}
          />
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/20 bg-[#071126]/85 p-3 backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-orange-200">Limited Seats Available</p>
              <p className="text-sm font-semibold text-white">From {megaTestDetails.startsOn} | {megaTestDetails.timing}</p>
            </div>
            <a href="#mega-test-registration" className="btn-gradient btn-anim rounded-xl px-4 py-2 text-sm font-semibold text-white">
              Register Now
            </a>
          </div>
        </div>

        <form id="mega-test-registration" onSubmit={submitMegaTestRegistration} className="rounded-2xl border border-orange-300/25 bg-[#0d1a3a]/80 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-orange-300">Mega Test Registration</p>
          <h2 className="mt-2 font-display text-3xl text-white">Reserve Your Seat</h2>
          <p className="mt-2 text-sm text-slate-300">
            Register for Mega Test 3.0. After submit, WhatsApp confirmation draft will open for the registered number.
          </p>
          <div className="mt-5 grid gap-3">
            <label className="grid gap-2 text-sm text-slate-200">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Student Name</span>
              <input
                value={registrationForm.name}
                onChange={(event) => updateRegistrationForm("name", event.target.value)}
                placeholder="Enter full name"
                className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm text-white outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-200">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">WhatsApp Number</span>
              <input
                value={registrationForm.phone}
                onChange={(event) => updateRegistrationForm("phone", event.target.value)}
                placeholder="9876543210"
                inputMode="tel"
                className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm text-white outline-none"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-200">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Exam</span>
                <select
                  value={registrationForm.exam}
                  onChange={(event) => updateRegistrationForm("exam", event.target.value)}
                  className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm text-white outline-none"
                >
                  <option>SSC CGL</option>
                  <option>SSC CHSL</option>
                  <option>Railway</option>
                  <option>MP Middle School Teacher</option>
                  <option>SI & Police</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-200">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">City</span>
                <input
                  value={registrationForm.city}
                  onChange={(event) => updateRegistrationForm("city", event.target.value)}
                  placeholder="Your city"
                  className="rounded-xl border border-white/10 bg-[#081127] px-3 py-3 text-sm text-white outline-none"
                />
              </label>
            </div>
            <button type="submit" className="btn-gradient btn-anim rounded-xl px-5 py-3 text-sm font-semibold text-white">
              Do Registration Fast
            </button>
            {registrationNotice ? (
              <p className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                {registrationNotice}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="animate-reveal mb-12 grid items-center gap-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c1f48] via-[#0b1634] to-[#08122b] p-6 shadow-glow md:grid-cols-2 md:p-10">
        <div>
          <p className="mb-3 inline-block rounded-full border border-orange-300/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-200">India's Trusted Online Exam Prep Platform</p>
          <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">{publishedBanner?.title || "Prepare Smarter with BadamClasses"}</h1>
          <p className="mt-4 max-w-2xl text-slate-300">{publishedBanner?.subtitle || "Join India's growing learning platform for SSC, Railway, Police, Teaching and other competitive exams."}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={publishedBanner?.ctaHref || "/batches"} className="btn-gradient btn-anim rounded-xl px-5 py-3 font-semibold text-white">{publishedBanner?.ctaLabel || "Start Learning"}</Link>
            <Link href="/batches" className="btn-anim rounded-xl border border-white/20 px-5 py-3 font-semibold text-slate-100 transition hover:border-orange-300">View Batches</Link>
          </div>
        </div>

        <div className="relative">
          <img
            src={heroBannerImage}
            alt="Students learning"
            className="cinematic-zoom float-soft h-72 w-full rounded-2xl object-cover md:h-96"
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
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-white/10 bg-[#0b1634] px-3 py-2 text-sm outline-none">
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
        <div className="overflow-auto">
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

      <section className="animate-reveal stagger-2 mb-14 rounded-3xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(6,78,59,0.26),rgba(13,26,58,0.82))] p-5 md:p-6">
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

      <TestimonialsCarousel items={testimonials} />

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
              <p>Support Email: <span className="text-orange-200">support@badamclasses.com</span></p>
              <p>WhatsApp Helpline: <span className="text-orange-200">+91 90000 11111</span></p>
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




