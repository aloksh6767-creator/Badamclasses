"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PdfViewer from "@/components/PdfViewer";
import SecureYouTubePlayer from "@/components/live/SecureYouTubePlayer";
import { apiFetch } from "@/lib/api";
import { getCourseFallbackImage, resolveCourseImage } from "@/lib/courseImages";
import { matchCourseByRoute, normalizeCourseForRoute, normalizeCourseRouteValue } from "@/lib/courseIdentity";
import { batches } from "@/lib/fixtures";
import { DEFAULT_LIVE_CLASS_URL, filterDeletedCourses, filterDeletedCoursesFromStorage, readDeletedCourseKeys, readLocalCourses as readVisibleLocalCourses } from "@/lib/localCourseState";
import { hasLocalPurchase } from "@/lib/purchaseState";
import { getLiveCountdown, getSliderConfig, isBatchLiveNow, pruneExpiredLiveNow } from "@/lib/sliderConfig";
import { readUserScopedJson, writeUserScopedJson } from "@/lib/userScopedStorage";
import { YOUTUBE_IFRAME_ALLOW, buildYouTubeEmbedUrl, getYouTubeWatchUrl, isYouTubeLiveUrl, normalizeLiveStatus } from "@/lib/youtubeEmbed";

const LOCAL_PDF_KEY = "badamclasses_local_pdfs";
const VIDEO_QUALITY_ORDER = ["240", "360", "420", "720", "1080"];

function readLocalPdfs() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_PDF_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed).flatMap(([courseId, items]) =>
        Array.isArray(items) ? items.map((item) => ({ ...item, courseId })) : []
      );
    }
    return [];
  } catch {
    return [];
  }
}

const readLocalCourses = () => filterDeletedCoursesFromStorage(readVisibleLocalCourses());

function sanitizeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return "";

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const blockedHosts = new Set(["example.com", "www.example.com", "example.org", "www.example.org", "example.net", "www.example.net"]);
    return blockedHosts.has(host) ? "" : raw;
  } catch {
    return "";
  }
}

function normalizePdfResources(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const url = sanitizeExternalUrl(item?.url || item?.pdfUrl || item?.href);
      if (!url) return null;
      return {
        ...item,
        id: item?.id || `pdf-${index}`,
        title: item?.title || `Sheet ${index + 1}`,
        url
      };
    })
    .filter(Boolean);
}

function normalizeQualityLabel(value = "") {
  const digits = String(value || "").match(/\d+/)?.[0];
  return digits ? `${digits}p` : String(value || "").trim() || "Auto";
}

function parseVideoSources(value) {
  const qualityWeight = (label = "") => {
    const digits = String(label || "").match(/\d+/)?.[0];
    const index = VIDEO_QUALITY_ORDER.indexOf(digits || "");
    return index === -1 ? Number(digits || 9999) : index;
  };

  if (!value) return [];

  let sources = [];

  if (Array.isArray(value)) {
    sources = value
      .map((item) => {
        if (typeof item === "string") {
          const url = sanitizeExternalUrl(item);
          return url ? { label: "Auto", url } : null;
        }

        const url = sanitizeExternalUrl(item?.url || item?.src || item?.videoUrl);
        if (!url) return null;
        return {
          label: normalizeQualityLabel(item?.quality || item?.label),
          url
        };
      })
      .filter(Boolean);
  } else if (typeof value === "object") {
    sources = Object.entries(value)
      .map(([quality, url]) => {
        const safeUrl = sanitizeExternalUrl(url);
        return safeUrl ? { label: normalizeQualityLabel(quality), url: safeUrl } : null;
      })
      .filter(Boolean);
  } else if (typeof value === "string") {
    sources = String(value)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [quality, url] = line.split("|").map((part) => part.trim());
        const safeUrl = sanitizeExternalUrl(url || quality);
        if (!safeUrl) return null;
        return {
          label: url ? normalizeQualityLabel(quality) : "Auto",
          url: safeUrl
        };
      })
      .filter(Boolean);
  }

  return sources.sort((a, b) => qualityWeight(a.label) - qualityWeight(b.label));
}

function getPreferredQualityLabel(items = []) {
  if (typeof window === "undefined") return items[0]?.label || "Auto";

  const screenWidth = Math.max(window.innerWidth || 0, window.screen?.width || 0);
  const preferred =
    screenWidth <= 480 ? "240p" :
    screenWidth <= 768 ? "360p" :
    screenWidth <= 992 ? "420p" :
    screenWidth <= 1440 ? "720p" :
    "1080p";

  const exact = items.find((item) => item.label === preferred);
  if (exact) return exact.label;

  const preferredValue = Number(preferred.replace(/\D+/g, ""));
  const sorted = [...items].sort(
    (a, b) => Number(a.label.replace(/\D+/g, "") || 0) - Number(b.label.replace(/\D+/g, "") || 0)
  );
  const bestFit = sorted.find((item) => Number(item.label.replace(/\D+/g, "") || 0) >= preferredValue);
  return bestFit?.label || sorted[sorted.length - 1]?.label || items[0]?.label || "Auto";
}

function isNativeVideoUrl(url = "") {
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
}

function isYouTubeChannelLiveUrl(url = "") {
  return isYouTubeLiveUrl(url);
}

function getPublicLiveClassUrl(url = "") {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return getYouTubeWatchUrl(url);
    }
  } catch {
    return url;
  }

  return url;
}

function getEmbeddableVideoUrl(url = "") {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtube.com")) {
      return buildYouTubeEmbedUrl(url, {
        origin: typeof window !== "undefined" ? window.location.origin : ""
      });
    }

    if (host.includes("youtu.be")) {
      return buildYouTubeEmbedUrl(url, {
        origin: typeof window !== "undefined" ? window.location.origin : ""
      });
    }

    if (host.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }

    if (host.includes("drive.google.com")) {
      const match = parsed.pathname.match(/\/file\/d\/([^/]+)/i);
      return match?.[1] ? `https://drive.google.com/file/d/${match[1]}/preview` : "";
    }
  } catch {
    return "";
  }

  return "";
}

function findMatchingLocalCourse(sourceCourse, routeId, localCourseItems = []) {
  const normalizedRouteId = normalizeCourseRouteValue(routeId);
  const normalizedSource = normalizeCourseForRoute(sourceCourse || {});
  const sourceId = normalizeCourseRouteValue(normalizedSource._id || normalizedSource.id);
  const sourceSlug = normalizeCourseRouteValue(normalizedSource.slug || normalizedSource.routeId);
  const sourceTitle = normalizeCourseRouteValue(normalizedSource.title);

  return localCourseItems.find((item) => {
    const normalizedItem = normalizeCourseForRoute(item);
    const itemId = normalizeCourseRouteValue(normalizedItem._id || normalizedItem.id);
    const itemSlug = normalizeCourseRouteValue(normalizedItem.slug || normalizedItem.routeId);
    const itemTitle = normalizeCourseRouteValue(normalizedItem.title);

    return (
      (normalizedRouteId &&
        (itemId === normalizedRouteId || itemSlug === normalizedRouteId || itemTitle === normalizedRouteId)) ||
      (sourceId && itemId === sourceId) ||
      (sourceSlug && itemSlug === sourceSlug) ||
      (sourceTitle && itemTitle === sourceTitle)
    );
  });
}

function normalizeClassSectionItems(items = []) {
  return items
    .filter((item) => item && (item.title || item.subtitle || item.href))
    .map((item, index) => {
      const safeHref = sanitizeExternalUrl(item.href);
      const safeViewUrl = sanitizeExternalUrl(item.viewUrl || item.href);
      const safePdfUrl = sanitizeExternalUrl(item.pdfUrl || item.pdf || item.notesUrl);

      return {
        id: item.id || `${String(item.title || "class").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "class"}-${index}`,
        title: item.title || `Class ${index + 1}`,
        subtitle: item.subtitle || "",
        dateTime: item.dateTime || item.subtitle || "",
        href: safeHref,
        viewUrl: safeViewUrl,
        pdfUrl: safePdfUrl,
        actionLabel: item.actionLabel || (safeHref ? "Open Class" : "Coming Soon"),
        icon: item.icon || "🎓"
      };
    });
}

function normalizeClassSections(sections = []) {
  return sections
    .filter((section) => section && section.title)
    .map((section, index) => ({
      id: section.id || `${String(section.title || "section").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "section"}-${index}`,
      title: section.title,
      items: normalizeClassSectionItems(section.items || [])
    }))
    .filter((section) => section.items.length);
}

function makeAutoSection(title, items) {
  return {
    title,
    items: items.map((item, index) => ({
      id: `${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
      ...item
    }))
  };
}

function buildAutomaticClassSections(course) {
  if (!course) return [];

  const title = String(course.title || "").trim();
  const category = String(course.category || "").trim().toLowerCase();
  const instructor = course.instructor?.name || course.instructor || "Badam Sir";
  const schedule = course.classTiming || course.batchTime || "Schedule will be updated";

  const makeItem = (itemTitle, subtitle, icon = "🎓") => ({
    title: itemTitle,
    subtitle: `${schedule} | ${subtitle}`,
    href: "",
    actionLabel: "View Now",
    pdfUrl: "",
    icon
  });

  const commonSSCSections = [
    makeAutoSection("Mathematics", [
      makeItem(`${title} Maths Foundation`, "Daily Live Class", "📘"),
      makeItem(`${title} Advanced Practice`, "Recorded + Live Support", "🧮")
    ]),
    makeAutoSection("Reasoning", [
      makeItem(`${title} Reasoning Concepts`, "Daily Practice Session", "🧠")
    ]),
    makeAutoSection("English", [
      makeItem(`${title} English Grammar`, "Vocabulary + Grammar", "📖")
    ]),
    makeAutoSection("General Studies (GS)", [
      makeItem(`${title} GS Daily Concepts`, "Smart Learning Session", "🌍")
    ])
  ];

  if (category === "ssc") {
    return commonSSCSections;
  }

  if (category === "banking") {
    return [
      makeAutoSection("Quantitative Aptitude", [
        makeItem(`${title} Quant Basics`, "Daily Live Class", "📘")
      ]),
      makeAutoSection("Reasoning", [
        makeItem(`${title} Banking Reasoning`, "Daily Practice Session", "🧠")
      ]),
      makeAutoSection("English", [
        makeItem(`${title} Banking English`, "Grammar + Reading", "📖")
      ]),
      makeAutoSection("General Awareness", [
        makeItem(`${title} GA Updates`, "Current Affairs + Banking Awareness", "🌍")
      ])
    ];
  }

  if (category === "state") {
    return [
      makeAutoSection("Reasoning", [
        makeItem(`${title} Reasoning Core`, "Daily Live Class", "🧠")
      ]),
      makeAutoSection("General Knowledge", [
        makeItem(`${title} GK Concepts`, "Static + Dynamic GK", "🌍")
      ]),
      makeAutoSection("Current Affairs", [
        makeItem(`${title} Current Affairs Roundup`, "Daily Updates", "📰")
      ])
    ];
  }

  return [
    makeAutoSection("Core Classes", [
      makeItem(`${title} Main Session`, "Daily Class", "📘"),
      makeItem(`${title} Practice Session`, "Revision + Practice", "📝")
    ]),
    makeAutoSection("Mentor Support", [
      makeItem(`${instructor} Guidance Session`, "Doubt + Strategy Session", "👨‍🏫")
    ])
  ];
}

function resolveClassSections(course, preferredSections = []) {
  const normalizedPreferred = normalizeClassSections(preferredSections);
  if (normalizedPreferred.length) {
    return normalizedPreferred;
  }

  return normalizeClassSections(buildAutomaticClassSections(course));
}

export default function CourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState("Classes");
  const [activeClassSection, setActiveClassSection] = useState("");
  const [hasPurchased, setHasPurchased] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [sliderConfig, setSliderConfig] = useState(null);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState("");
  const [liveStatus, setLiveStatus] = useState(null);
  const [liveStatusLoading, setLiveStatusLoading] = useState(false);
  const [localCourses, setLocalCourses] = useState([]);
  const [deletedCourseKeys, setDeletedCourseKeys] = useState([]);

  const fallbackCourse = useMemo(() => {
    const id = params?.id;
    if (!id) return null;
    const mergedCourses = [
      ...localCourses.map((course, index) => normalizeCourseForRoute(course, index)),
      ...filterDeletedCourses(batches, deletedCourseKeys).map((batch, index) =>
        normalizeCourseForRoute(
          {
            _id: batch.id,
            id: batch.id,
            slug: batch.id,
            title: batch.title,
            instructor: batch.instructor,
            price: batch.priceValue,
            category: batch.category,
            image: batch.image,
            batchTime: batch.batchTime,
            startDate: batch.startDate,
            classTiming: batch.classTiming,
            liveClassUrl: batch.liveClassUrl,
            liveClassEnabled: batch.liveClassEnabled,
            liveClassTitle: batch.liveClassTitle,
            description: batch.description,
            duration: batch.duration,
            months: batch.months,
            highlights: batch.highlights,
            classSections: batch.classSections
          },
          index
        )
      )
    ];
    const matched = matchCourseByRoute(mergedCourses, id);
    console.debug("[course-details] fallback lookup", { routeId: id, matched });
    return matched;
  }, [deletedCourseKeys, localCourses, params]);

  const mergeCourseWithLocalPdfs = (sourceCourse) => {
    if (!sourceCourse) return sourceCourse;
    const localCourse = findMatchingLocalCourse(sourceCourse, params?.id, localCourses);
    const normalizedSource = normalizeCourseForRoute(sourceCourse);
    const normalizedLocal = localCourse ? normalizeCourseForRoute(localCourse) : null;
    const localClassSections = normalizeClassSections(localCourse?.classSections || []);
    const sourceClassSections = resolveClassSections(sourceCourse, sourceCourse?.classSections || []);
    const localPdfs = readLocalPdfs().filter(
      (item) =>
        normalizeCourseRouteValue(item.courseId || "") ===
          normalizeCourseRouteValue(normalizedLocal?._id || normalizedSource._id || normalizedSource.id) ||
        normalizeCourseRouteValue(item.courseTitle || "") ===
          normalizeCourseRouteValue(normalizedLocal?.title || normalizedSource.title || "")
    );

    return {
      ...normalizedSource,
      ...localCourse,
      ...normalizeCourseForRoute({ ...normalizedSource, ...localCourse }),
      pdfResources: normalizePdfResources([...(sourceCourse.pdfResources || []), ...localPdfs]),
      classSections: localClassSections.length ? localClassSections : sourceClassSections
    };
  };

  const classSections = resolveClassSections(course, course?.classSections || []);

  const loadCourse = async () => {
    const routeId = params?.id;
    const matchedFallback = mergeCourseWithLocalPdfs(fallbackCourse);
    setLoading(!matchedFallback);
    if (matchedFallback) {
      setCourse(matchedFallback);
    }
    console.debug("[course-details] loading route", { routeId });
    try {
      const data = await apiFetch(`/courses/${routeId}`);
      const mergedCourse = mergeCourseWithLocalPdfs(data?.course || data);
      console.debug("[course-details] api success", {
        routeId,
        title: mergedCourse?.title,
        resolvedId: mergedCourse?._id || mergedCourse?.id || mergedCourse?.slug
      });
      setCourse(mergedCourse);
    } catch (error) {
      console.debug("[course-details] api fallback", {
        routeId,
        error: error?.message || "unknown",
        fallbackTitle: matchedFallback?.title || null
      });
      if (!matchedFallback) {
        setCourse(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDeletedCourseKeys(readDeletedCourseKeys());
    setLocalCourses(readLocalCourses());
  }, []);

  useEffect(() => {
    loadCourse();
    const payment = searchParams.get("payment");
    if (payment === "cancel") setNotice("Payment was cancelled. Try again anytime.");
  }, [localCourses, params?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const refreshLiveConfig = () => {
      let config = getSliderConfig();
      const pruned = pruneExpiredLiveNow(config);
      if (pruned !== config) {
        config = pruned;
        window.localStorage.setItem("badamclasses_slider_config", JSON.stringify(pruned));
      }
      setSliderConfig(config);
    };

    refreshLiveConfig();
    const intervalId = window.setInterval(refreshLiveConfig, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setActiveClassSection(classSections[0]?.title || "");
  }, [classSections]);

  useEffect(() => {
    if (!selectedVideo?.sources?.length) {
      setSelectedQuality("");
      setLiveStatus(null);
      return;
    }

    const availableLabels = selectedVideo.sources.map((item) => item.label);
    if (availableLabels.includes(selectedQuality)) return;
    setSelectedQuality(getPreferredQualityLabel(selectedVideo.sources));
  }, [selectedQuality, selectedVideo]);

  useEffect(() => {
    if (!selectedVideo?.sources?.length) {
      setLiveStatus(null);
      return undefined;
    }

    const isLiveSelection =
      selectedVideo.title === "Today's Class" ||
      selectedVideo.sources.some((source) => source.label === "Live");
    const source = selectedVideo.sources.find((item) => item.label === selectedQuality) || selectedVideo.sources[0];

    if (!isLiveSelection || !source?.url) {
      setLiveStatus(null);
      return undefined;
    }

    let cancelled = false;

    const checkLiveStatus = async () => {
      setLiveStatusLoading(true);
      try {
        const data = await apiFetch(`/live-status?url=${encodeURIComponent(source.url)}`);
        if (!cancelled) {
          setLiveStatus(data);
        }
      } catch (error) {
        if (!cancelled) {
          setLiveStatus({
            status: "error",
            embeddable: false,
            watchUrl: getPublicLiveClassUrl(source.url),
            message: error?.message || "Live status check failed."
          });
        }
      } finally {
        if (!cancelled) {
          setLiveStatusLoading(false);
        }
      }
    };

    checkLiveStatus();
    const intervalId = window.setInterval(checkLiveStatus, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedQuality, selectedVideo]);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      if (!course) return;
      const explicitDetails = searchParams.get("details") === "1";
      const localPurchase = hasLocalPurchase(course);

      try {
        const enrollments = await apiFetch("/enrollments/my");
        const purchased = localPurchase || (Array.isArray(enrollments)
          ? enrollments.some((item) => {
              const enrollmentRouteId = String(item?.courseRouteId || item?.course?.routeId || item?.course?._id || item?.course?.id || "").trim().toLowerCase();
              const currentRouteId = String(course?.routeId || course?._id || course?.id || "").trim().toLowerCase();
              const enrollmentTitle = String(item?.course?.title || item?.courseTitle || "").trim().toLowerCase();
              const currentTitle = String(course?.title || "").trim().toLowerCase();
              return enrollmentRouteId === currentRouteId || (enrollmentTitle && enrollmentTitle === currentTitle);
            })
          : false);

        if (!cancelled) {
          setHasPurchased(purchased);
          setAccessChecked(true);
          if (purchased && !explicitDetails) {
            router.replace(`/learn/${encodeURIComponent(course.routeId || course._id || course.id || params?.id)}`);
          }
        }
      } catch {
        if (!cancelled) {
          setHasPurchased(localPurchase);
          setAccessChecked(true);
          if (localPurchase && !explicitDetails) {
            router.replace(`/learn/${encodeURIComponent(course.routeId || course._id || course.id || params?.id)}`);
          }
        }
      }
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [course, params?.id, router, searchParams]);

  if (loading) {
    return <main className="mx-auto w-[92%] max-w-6xl py-10">Loading course details...</main>;
  }

  if (!course) {
    return (
      <main className="mx-auto w-[92%] max-w-6xl py-10">
        <h1 className="font-display text-3xl">Course not found</h1>
        <Link href="/courses" className="mt-4 inline-block rounded-lg border border-white/20 px-4 py-2 text-sm">
          Back to Courses
        </Link>
      </main>
    );
  }

  const price = Number(course.price || course.priceValue || 0);
  const offerPrice = Number(course.offerPrice || 0);
  const hasOffer = offerPrice > 0 && offerPrice < price;
  const discountLabel =
    course.offerLabel || (course.discountPercent ? `${course.discountPercent}% OFF` : "");
  const pdfResources = normalizePdfResources(course.pdfResources);
  const videoSources = parseVideoSources(course.videoSources || course.videos || []);
  if (course.recordedVideoUrl && !videoSources.length) {
    videoSources.push({ label: "Auto", url: sanitizeExternalUrl(course.recordedVideoUrl) });
  }
  const liveNow = sliderConfig ? isBatchLiveNow(course, sliderConfig) : false;
  const liveCountdown = sliderConfig ? getLiveCountdown(course, sliderConfig) : null;
  const liveClassEnabled = liveNow || Boolean(course.liveClassEnabled);
  const liveClassUrl = liveClassEnabled ? sanitizeExternalUrl(course.liveClassUrl || DEFAULT_LIVE_CLASS_URL) : "";
  const liveClassVisible = liveNow || Boolean(liveClassUrl);
  const liveClassCard = {
    title: "Today's Class",
    subtitle: liveNow
      ? course.liveClassTitle || "Live class is running now"
      : course.liveClassTitle || "Live session available",
    actionLabel: liveClassUrl
      ? liveNow
        ? "Join Live Now"
        : "Join Live"
      : liveNow
        ? "Live Link Updating"
        : "Live Link Soon",
    href: liveClassUrl,
    videoSources: liveClassUrl
      ? [
          {
            label: "Live",
            url: liveClassUrl
          }
        ]
      : []
  };
  const classCards = [
    ...(liveClassVisible ? [liveClassCard] : []),
    {
      title: course.subject || "Core Subject",
      subtitle: course.instructor?.name || course.instructor || "Badam Sir",
      actionLabel: videoSources.length ? "Watch Recording" : "Recording Soon",
      href: videoSources[0]?.url || "",
      videoSources
    }
  ];
  const activeVideoSource =
    selectedVideo?.sources?.find((item) => item.label === selectedQuality) ||
    selectedVideo?.sources?.[0] ||
    null;
  const activeVideoUrl = activeVideoSource?.url || "";
  const isLiveClassPlayer =
    selectedVideo?.title === "Today's Class" ||
    selectedVideo?.sources?.some((source) => source.label === "Live");
  const shouldUseExternalLivePlayer = isLiveClassPlayer && isYouTubeChannelLiveUrl(activeVideoUrl);
  const normalizedLiveStatus = liveStatus ? normalizeLiveStatus(liveStatus, activeVideoUrl, typeof window !== "undefined" ? window.location.origin : "") : null;
  const activeVideoLink = normalizedLiveStatus?.watchUrl || (activeVideoSource ? getPublicLiveClassUrl(activeVideoUrl) : "");
  const liveEmbedUrl = normalizedLiveStatus?.embeddable ? normalizedLiveStatus.embedUrl : "";
  const embeddedVideoUrl = activeVideoSource && !shouldUseExternalLivePlayer ? getEmbeddableVideoUrl(activeVideoSource.url) : liveEmbedUrl;
  const livePlayerStatus = normalizedLiveStatus?.status || (shouldUseExternalLivePlayer ? "unknown" : "");
  const canRenderNativeVideo = activeVideoSource ? isNativeVideoUrl(activeVideoSource.url) : false;
  const sectionClassCards =
    classSections.find((section) => section.title === activeClassSection)?.items || classCards;
  const displayedClassCards =
    liveClassVisible && sectionClassCards !== classCards
      ? [liveClassCard, ...sectionClassCards]
      : sectionClassCards;
  const tests = Array.isArray(course.tests) && course.tests.length
    ? course.tests
    : [
        { title: "Weekly Practice Test", duration: "30 min", status: "Available Soon" },
        { title: "Revision Mock Test", duration: "45 min", status: "Unlocking Soon" }
      ];
  const isLocked = accessChecked && !hasPurchased;

  return (
    <main className="mx-auto w-[92%] max-w-7xl py-10">
      {notice ? (
        <div className="mb-6 rounded-xl border border-orange-300/40 bg-orange-500/10 p-4 text-orange-100">
          {notice}
        </div>
      ) : null}

      <section className="rounded-[32px] border border-white/10 bg-card/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.45)]">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#0c1734] px-5 py-4 text-center text-lg font-semibold text-white">
            Batch Detail
          </div>
          <div className="rounded-2xl border border-white/10 bg-white px-5 py-4 text-center text-lg font-semibold text-slate-900">
            Batch Content
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1734]">
            <img
              src={resolveCourseImage(course)}
              alt={course.title}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = getCourseFallbackImage(course);
              }}
              className="h-full min-h-[360px] w-full object-contain"
            />
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#10214a] p-6">
            <p className="text-sm uppercase tracking-[0.35em] text-orange-300">Batch Summary</p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-white">{course.title}</h1>
            <p className="mt-4 text-lg text-slate-200">
              Instructor: {course.instructor?.name || course.instructor || "Badam Sir"}
            </p>
            <p className="mt-2 text-lg text-slate-200">
              Duration: {course.duration || `${course.months || 12} Months`}
            </p>
            {course.batchTime ? (
              <p className="mt-2 text-lg text-slate-200">Batch Timing: {course.batchTime}</p>
            ) : null}
            {course.startDate ? (
              <p className="mt-2 text-lg text-slate-200">Start Date: {course.startDate}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <p className="text-4xl font-semibold text-orange-300">
                {"\u20B9"}
                {(hasOffer ? offerPrice : price).toLocaleString("en-IN")}
              </p>
              {hasOffer ? (
                <span className="text-base text-slate-400 line-through">
                  {"\u20B9"}
                  {price.toLocaleString("en-IN")}
                </span>
              ) : null}
              {hasOffer ? (
                <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-200">
                  {discountLabel || "Special Offer"}
                </span>
              ) : null}
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  hasPurchased ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-slate-200"
                }`}
              >
                {accessChecked ? (hasPurchased ? "Purchased Access" : "Locked Access") : "Checking Access"}
              </span>
              {liveClassVisible ? (
                <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-200">
                  LIVE NOW
                </span>
              ) : null}
              {liveCountdown ? (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Ends in {liveCountdown.label}
                </span>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {hasPurchased ? (
                <>
                  <button
                    onClick={() => setActiveTab("Classes")}
                    className="btn-gradient btn-anim rounded-xl px-5 py-3 font-semibold text-white"
                  >
                    Open Access
                  </button>
                  <button
                    onClick={() => setActiveTab("Sheets")}
                    className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-slate-100 transition hover:border-orange-300"
                  >
                    Open PDFs
                  </button>
                </>
              ) : (
                <Link href={`/checkout?course=${encodeURIComponent(course.routeId || course._id || course.title)}`} className="btn-gradient btn-anim rounded-xl px-5 py-3 font-semibold text-white">
                  Buy Course
                </Link>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b1634]/80 p-4 text-sm text-slate-300">
              {course.description ||
                "Comprehensive preparation with structured classes, sheets, tests, and mentor support."}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-[28px] border border-white/10 bg-[#0c1734] p-6 text-center">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border-[14px] border-blue-500/90 text-2xl text-white shadow-[0_0_30px_rgba(59,130,246,0.28)]">
              {course.level || "beginner"}
            </div>
            <p className="mt-5 text-2xl font-semibold text-white">Level</p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-[#0c1734] p-6 text-center">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border-[14px] border-slate-200 text-3xl text-white">
              {course.progress || "0%"}
            </div>
            <p className="mt-5 text-2xl font-semibold text-white">Batch Completion</p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-[#0c1734] p-6 text-center">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border-[14px] border-slate-200 text-3xl text-white">
              {course.watchTime || "0%"}
            </div>
            <p className="mt-5 text-2xl font-semibold text-white">Watch Time</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {["Classes", "Sheets", "Tests"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-2xl px-5 py-3 text-lg font-semibold transition ${
                activeTab === tab
                  ? "bg-white text-slate-900"
                  : "border border-white/15 bg-[#0f1b3b] text-white hover:border-orange-300/60"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-6 min-h-[280px] rounded-[28px] border border-white/10 bg-[#0b1328] p-6">
          {isLocked ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
              <p className="text-2xl font-semibold text-white">Purchase required to open course content</p>
              <p className="mt-3 max-w-2xl text-slate-300">
                Complete checkout to unlock classes, PDFs, and tests for this batch. After successful payment, it will appear in My Courses.
              </p>
              <Link href={`/checkout?course=${encodeURIComponent(course.routeId || course._id || course.title)}`} className="btn-gradient btn-anim mt-6 rounded-xl px-5 py-3 font-semibold text-white">
                Buy This Course
              </Link>
            </div>
          ) : activeTab === "Classes" ? (
            <div>
              {classSections.length ? (
                <div className="mb-5 flex flex-wrap gap-3">
                  {classSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveClassSection(section.title)}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        activeClassSection === section.title
                          ? "bg-orange-400 text-slate-950"
                          : "border border-white/15 bg-[#0f1b3b] text-white hover:border-orange-300/60"
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {displayedClassCards.map((item) => (
                  <div key={item.id || item.title} className="rounded-[28px] border border-white/10 bg-[#152349] p-5 text-white">
                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-700/90 text-5xl">
                      {item.icon || (item.title === "Today's Class" ? "📅" : "👨‍🏫")}
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold">{item.title}</h3>
                    <p className="mt-2 text-lg text-slate-300">{item.subtitle}</p>
                    {item.videoSources?.length ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVideo({
                            title: item.title,
                            sources: item.videoSources
                          });
                          setSelectedQuality(getPreferredQualityLabel(item.videoSources));
                        }}
                        className="mt-5 inline-flex rounded-xl border border-orange-300/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/20"
                      >
                        {item.actionLabel}
                      </button>
                    ) : item.pdfUrl ? (
                      <button
                        type="button"
                        onClick={() => setSelectedPdf({ title: item.title, url: item.pdfUrl })}
                        className="mt-5 inline-flex rounded-xl border border-orange-300/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/20"
                      >
                        {item.actionLabel || "Open PDF"}
                      </button>
                    ) : item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 inline-flex rounded-xl border border-orange-300/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/20"
                      >
                        {item.actionLabel}
                      </a>
                    ) : item.title === "Today's Class" && liveNow ? (
                      <span className="mt-5 inline-flex rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100">
                        Live is on. Join link is being updated.
                      </span>
                    ) : (
                      <span className="mt-5 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400">
                        {item.actionLabel}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "Sheets" ? (
            <div>
              <h2 className="text-2xl font-semibold text-white">PDF Notes & Sheets</h2>
              {pdfResources.length ? (
                <div className="mt-5 grid gap-4">
                  {pdfResources.map((pdf, index) => (
                    <div
                      key={`${pdf.title || "pdf"}-${pdf.url || index}`}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#152349] p-5 md:flex-row md:items-center"
                    >
                      <div>
                        <p className="text-xl font-semibold text-white">{pdf.title || `Sheet ${index + 1}`}</p>
                        <p className="mt-1 text-sm text-slate-300">
                          Saved PDF for this batch. Open or download anytime.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPdf(pdf)}
                          className="inline-flex rounded-xl border border-orange-300/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/20"
                        >
                          Open PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-[#152349] p-6 text-slate-300">
                  No PDFs added yet. Once admin uploads PDF notes for this batch, they will appear here.
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "Tests" ? (
            <div>
              <h2 className="text-2xl font-semibold text-white">Practice Tests</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {tests.map((test) => (
                  <div key={test.title} className="rounded-2xl border border-white/10 bg-[#152349] p-5">
                    <p className="text-xl font-semibold text-white">{test.title}</p>
                    <p className="mt-2 text-sm text-slate-300">Duration: {test.duration}</p>
                    <p className="mt-3 text-sm text-orange-200">{test.status}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-center text-lg text-white/90">
          {pdfResources.length || classCards.length ? "Content is available in the selected tab." : "Content will be uploaded soon"}
        </p>
      </section>

      {selectedPdf ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#091224] shadow-[0_24px_80px_rgba(15,23,42,0.65)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-orange-300">PDF Viewer</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{selectedPdf.title || "Course PDF"}</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={selectedPdf.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-orange-300/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/20"
                >
                  Open New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedPdf(null)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <PdfViewer sourceUrl={selectedPdf.url} title={selectedPdf.title || "Course PDF"} />
            </div>
          </div>
        </div>
      ) : null}

      {selectedVideo ? (
        <div className="fixed inset-0 z-50 bg-[#050914]">
          <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#091224]">
            <div className="flex flex-col gap-3 border-b border-white/10 bg-[#091224]/95 px-4 py-3 shadow-[0_12px_40px_rgba(2,6,23,0.35)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.3em] text-orange-300">Class Player</p>
                <h3 className="mt-1 truncate text-lg font-semibold text-white sm:text-xl">{selectedVideo.title || "Recorded Class"}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {selectedVideo.sources?.length > 1 ? (
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <span>Quality</span>
                    <select
                      value={selectedQuality}
                      onChange={(event) => setSelectedQuality(event.target.value)}
                      className="rounded-lg border border-white/15 bg-[#10214a] px-3 py-2 text-sm text-white outline-none"
                    >
                      {selectedVideo.sources.map((source) => (
                        <option key={`${source.label}-${source.url}`} value={source.label}>
                          {source.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {activeVideoSource && !isLiveClassPlayer ? (
                  <a
                    href={activeVideoLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-orange-300/40 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/20 sm:px-4"
                  >
                    Open New Tab
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelectedVideo(null)}
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:border-orange-300/50 sm:px-4"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-2 sm:p-4">
              {shouldUseExternalLivePlayer ? (
                <p className="mb-3 px-1 text-xs text-slate-300 sm:text-sm">
                  {liveStatusLoading ? "Checking live class status..." : "Live status refreshes automatically every 30 seconds."}
                </p>
              ) : (
                <p className="mb-3 px-1 text-xs text-slate-300 sm:text-sm">
                  Available quality adapts to your screen by default. Switch manually anytime if multiple sources are configured.
                </p>
              )}
              <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-black sm:rounded-[24px]">
                {shouldUseExternalLivePlayer && activeVideoSource ? (
                  <SecureYouTubePlayer
                    sourceUrl={activeVideoSource.url}
                    title={selectedVideo.title || "Live Class"}
                    liveStatus={normalizedLiveStatus}
                    loading={liveStatusLoading}
                    className="h-full w-full bg-black"
                  />
                ) : canRenderNativeVideo && activeVideoSource ? (
                  <video
                    key={activeVideoSource.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full bg-black object-contain"
                    src={activeVideoSource.url}
                  />
                ) : embeddedVideoUrl ? (
                  <iframe
                    key={embeddedVideoUrl}
                    src={embeddedVideoUrl}
                    title={selectedVideo.title || "Recorded Class"}
                    allow={YOUTUBE_IFRAME_ALLOW}
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="h-full w-full bg-black"
                  />
                ) : activeVideoSource ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center p-6 text-center text-slate-300">
                    <div>
                      <p className="text-lg font-semibold text-white">Inline player is not supported for this video source.</p>
                      <p className="mt-2 text-sm text-slate-400">Use "Open New Tab" to watch this class from the original provider.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[320px] items-center justify-center p-6 text-slate-400">
                    Video source unavailable.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
