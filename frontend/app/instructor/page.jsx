"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { resolveCourseImage } from "@/lib/courseImages";
import { batches } from "@/lib/fixtures";
import { applySliderConfig, getAutoWindowMinutes, getOfferBanner, getSliderConfig, makeBatchKey, saveOfferBanner, saveSliderConfig } from "@/lib/sliderConfig";

const initialState = {
  title: "",
  description: "",
  price: "",
  offerPrice: "",
  discountPercent: "",
  offerLabel: "",
  startTime: "",
  endTime: "",
  batchTime: "",
  startDate: "",
  category: "",
  thumbnail: "",
  recordedVideoUrl: "",
  videoQualityText: "",
  liveClassUrl: "",
  classTiming: "",
  curriculum: "",
  classSectionsText: ""
};

const createEmptyClassDraft = () => ({
  title: "",
  subtitle: "",
  href: "",
  actionLabel: "Open Class",
  icon: "🎓"
});

const createEmptySectionDraft = (title = "") => ({
  id: `section-draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title,
  items: [createEmptyClassDraft()]
});

const LOCAL_KEY = "badamclasses_instructor_courses";
const CHAT_LOG_KEY = "bsc_chat_log";
const LOCAL_PDF_KEY = "badamclasses_local_pdfs";
const LOCAL_DELETED_KEY = "badamclasses_deleted_courses";

const formatStableDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  }).format(date);
};

const normalizeStorageId = (value) => String(value || "").trim().toLowerCase();

const getCourseStorageKey = (course = {}) =>
  normalizeStorageId(course._id || course.id || course.title);

const sanitizeCourseForStorage = (course = {}) => {
  const thumbnail = String(course.thumbnail || "").trim();
  return {
    ...course,
    thumbnail: thumbnail.startsWith("data:") ? "" : thumbnail,
    videos: Array.isArray(course.videos) ? [] : [],
    pdfResources: Array.isArray(course.pdfResources) ? [] : []
  };
};

const sanitizeCoursesForStorage = (items = []) => items.map((item) => sanitizeCourseForStorage(item));

const readLocalCourses = () => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeLocalCourses = (items) => {
  if (typeof window === "undefined") {
    return;
  }
  const nextItems = Array.isArray(items) ? items : [];
  if (!nextItems.length) {
    window.localStorage.removeItem(LOCAL_KEY);
    return;
  }
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(nextItems));
  } catch (error) {
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(sanitizeCoursesForStorage(nextItems)));
    } catch {
      throw error;
    }
  }
};

const readDeletedCourseKeys = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_DELETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeDeletedCourseKeys = (items) => {
  if (typeof window === "undefined") return;
  const nextItems = Array.from(new Set((items || []).map((item) => normalizeStorageId(item)).filter(Boolean)));
  if (!nextItems.length) {
    window.localStorage.removeItem(LOCAL_DELETED_KEY);
    return;
  }
  window.localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(nextItems));
};

const addDeletedCourseKey = (course) => {
  const key = getCourseStorageKey(course);
  if (!key) return;
  const current = readDeletedCourseKeys();
  writeDeletedCourseKeys([...current, key]);
};

const removeDeletedCourseKey = (course) => {
  const key = getCourseStorageKey(course);
  if (!key) return;
  const current = readDeletedCourseKeys().filter((item) => item !== key);
  writeDeletedCourseKeys(current);
};

const upsertLocalCourse = (course) => {
  const localCourses = readLocalCourses();
  const next = normalizeCourse(course);
  removeDeletedCourseKey(next);
  const index = localCourses.findIndex(
    (item) =>
      String(item._id || item.id || "") === String(next._id || next.id || "") ||
      String(item.title || "").trim().toLowerCase() === String(next.title || "").trim().toLowerCase()
  );

  if (index >= 0) {
    localCourses[index] = { ...localCourses[index], ...next };
    writeLocalCourses(localCourses);
    return localCourses;
  }

  const updated = [next, ...localCourses];
  writeLocalCourses(updated);
  return updated;
};

const readLocalPdfs = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_PDF_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeLocalPdfs = (data) => {
  if (typeof window === "undefined") return;
  const nextData = data && typeof data === "object" ? data : {};
  if (!Object.keys(nextData).length) {
    window.localStorage.removeItem(LOCAL_PDF_KEY);
    return;
  }
  window.localStorage.setItem(LOCAL_PDF_KEY, JSON.stringify(nextData));
};

const removeLocalPdfsForCourse = (courseId) => {
  const key = String(courseId || "");
  if (!key) return;
  const localPdfs = readLocalPdfs();
  if (!(key in localPdfs)) return;
  delete localPdfs[key];
  writeLocalPdfs(localPdfs);
};

const splitBatchTimeRange = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) {
    return { startTime: "", endTime: "" };
  }

  const parts = raw.split(/\s+(?:to|-|–)\s+/i).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { startTime: parts[0], endTime: parts[1] };
  }

  return { startTime: raw, endTime: "" };
};

const buildBatchTimeLabel = (startTime = "", endTime = "", fallback = "") => {
  const start = String(startTime || "").trim();
  const end = String(endTime || "").trim();
  if (start && end) return `${start} to ${end}`;
  if (start) return start;
  return String(fallback || "").trim();
};

const getCourseSchedule = (course = {}) => {
  const parsed = splitBatchTimeRange(course.batchTime);
  const startTime = String(course.startTime || parsed.startTime || "").trim();
  const endTime = String(course.endTime || parsed.endTime || "").trim();
  return {
    startTime,
    endTime,
    batchTime: buildBatchTimeLabel(startTime, endTime, course.batchTime)
  };
};

const normalizeClassSectionItems = (items = []) => {
  return items
    .filter((item) => item && (item.title || item.subtitle || item.href))
    .map((item, index) => ({
      id: item.id || `${String(item.title || "class").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "class"}-${index}`,
      title: item.title || `Class ${index + 1}`,
      subtitle: item.subtitle || "",
      href: sanitizeStoredUrl(item.href),
      actionLabel: item.actionLabel || (sanitizeStoredUrl(item.href) ? "Open Class" : "Coming Soon"),
      icon: item.icon || "🎓"
    }));
};

const normalizeClassSections = (sections = []) => {
  return sections
    .filter((section) => section && section.title)
    .map((section, index) => ({
      id: section.id || `${String(section.title || "section").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "section"}-${index}`,
      title: section.title,
      items: normalizeClassSectionItems(section.items || [])
    }))
    .filter((section) => section.items.length);
};

const parseClassSectionsText = (value = "") => {
  const lines = String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sectionMap = new Map();

  lines.forEach((line) => {
    const [sectionTitle, cardTitle, subtitle, href, actionLabel, icon] = line
      .split("|")
      .map((part) => part.trim());

    if (!sectionTitle || !cardTitle) return;

    if (!sectionMap.has(sectionTitle)) {
      sectionMap.set(sectionTitle, { title: sectionTitle, items: [] });
    }

    sectionMap.get(sectionTitle).items.push({
      title: cardTitle,
      subtitle: subtitle || "",
      href: href || "",
      actionLabel: actionLabel || (href ? "Open Class" : "Coming Soon"),
      icon: icon || "🎓"
    });
  });

  return normalizeClassSections(Array.from(sectionMap.values()));
};

const stringifyClassSections = (sections = []) => {
  return normalizeClassSections(sections)
    .flatMap((section) =>
      section.items.map((item) =>
        [section.title, item.title, item.subtitle || "", item.href || "", item.actionLabel || "", item.icon || ""].join(" | ")
      )
    )
    .join("\n");
};

const buildSectionDraftsFromText = (value = "") => {
  const parsed = parseClassSectionsText(value);
  if (!parsed.length) return [createEmptySectionDraft("")];
  return parsed.map((section, sectionIndex) => ({
    id: section.id || `section-draft-${sectionIndex}`,
    title: section.title || "",
    items: (section.items || []).map((item) => ({
      title: item.title || "",
      subtitle: item.subtitle || "",
      href: item.href || "",
      actionLabel: item.actionLabel || "Open Class",
      icon: item.icon || "🎓"
    }))
  }));
};

const stringifySectionDrafts = (drafts = []) =>
  stringifyClassSections(
    drafts.map((section) => ({
      id: section.id,
      title: section.title,
      items: (section.items || []).map((item) => ({
        title: item.title,
        subtitle: item.subtitle,
        href: item.href,
        actionLabel: item.actionLabel,
        icon: item.icon
      }))
    }))
  );

const parseVideoQualityText = (value = "") =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [quality, url] = line.split("|").map((part) => part.trim());
      const safeUrl = sanitizeStoredUrl(url || quality);
      if (!safeUrl) return null;
      return {
        quality: url ? quality || "Auto" : "Auto",
        label: url ? `${String(quality || "Auto").replace(/p$/i, "")}p` : "Auto",
        url: safeUrl
      };
    })
    .filter(Boolean);

const stringifyVideoQualityText = (sources = []) =>
  (Array.isArray(sources) ? sources : [])
    .map((item) => `${item.quality || item.label || "Auto"} | ${item.url || ""}`.trim())
    .filter(Boolean)
    .join("\n");

const normalizeCourse = (course) => {
  const schedule = getCourseSchedule(course);
  const safeThumbnail = sanitizeStoredUrl(course.thumbnail || course.image, { allowRelative: true, allowDataImage: true });
  const safeRecordedVideoUrl = sanitizeStoredUrl(course.recordedVideoUrl);
  const safeLiveClassUrl = sanitizeStoredUrl(course.liveClassUrl);
  const safeVideoSources = (Array.isArray(course.videoSources) ? course.videoSources : [])
    .map((item) => ({
      ...item,
      url: sanitizeStoredUrl(item.url)
    }))
    .filter((item) => item.url);
  const safePdfResources = (Array.isArray(course.pdfResources) ? course.pdfResources : [])
    .map((pdf) => ({ ...pdf, url: sanitizeStoredUrl(pdf.url) }))
    .filter((pdf) => pdf.url);

  return {
    ...course,
    _id: course._id || course.id,
    title: course.title || "Untitled Batch",
    price: Number(course.price ?? course.priceValue ?? 0),
    thumbnail: safeThumbnail || resolveCourseImage(course),
    instructor: course.instructor?.name || course.instructor || "BadamClasses",
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    batchTime: schedule.batchTime,
    classTiming: course.classTiming || "",
    recordedVideoUrl: safeRecordedVideoUrl,
    videoSources: safeVideoSources,
    liveClassUrl: safeLiveClassUrl,
    videos: Array.isArray(course.videos) ? course.videos : [],
    pdfResources: safePdfResources,
    classSections: normalizeClassSections(course.classSections || [])
  };
};

const buildMergedCourses = (remoteCourses = []) => {
  const localCourses = readLocalCourses();
  const deletedKeys = new Set(readDeletedCourseKeys());
  const fallbackCourses = batches.map((batch) =>
    normalizeCourse({
      _id: batch.id,
      title: batch.title,
      instructor: batch.instructor,
      price: batch.priceValue,
      category: batch.category,
      duration: batch.duration,
      months: batch.months,
      thumbnail: batch.image,
      videos: [],
      pdfResources: []
    })
  );

  const combined = [
    ...localCourses.map((course) => normalizeCourse(course)),
    ...remoteCourses.map((course) => normalizeCourse(course)),
    ...fallbackCourses
  ];

  const seen = new Set();
  return combined.filter((course) => {
    const key =
      String(course._id || "").trim().toLowerCase() ||
      String(course.title || "").trim().toLowerCase();
    if (!key || seen.has(key) || deletedKeys.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const mergeCoursesWithLocalPdfs = (items) => {
  const localPdfs = readLocalPdfs();
  return items.map((course) => {
    const key = String(course._id || course.id || "");
    const extra = localPdfs[key] || [];
    const merged = [...(course.pdfResources || []), ...extra];
    const seen = new Set();
    const deduped = merged.filter((pdf) => {
      const pdfKey = `${String(pdf.title || "").trim().toLowerCase()}::${String(pdf.url || "").trim()}`;
      if (seen.has(pdfKey)) return false;
      seen.add(pdfKey);
      return true;
    });
    return { ...course, pdfResources: deduped };
  });
};

const dedupeByBatchKey = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = makeBatchKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const DEMO_HOSTS = new Set([
  "example.com",
  "www.example.com",
  "example.org",
  "www.example.org",
  "example.net",
  "www.example.net"
]);

function sanitizeStoredUrl(value, { allowRelative = false, allowDataImage = false } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (allowDataImage && /^data:image\//i.test(raw)) {
    return raw;
  }

  if (allowRelative && raw.startsWith("/")) {
    return raw;
  }

  if (!/^https?:\/\//i.test(raw)) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    return DEMO_HOSTS.has(parsed.hostname.toLowerCase()) ? "" : raw;
  } catch {
    return "";
  }
}

const isAllowedUrlValue = (value, { allowRelative = false, allowDataImage = false } = {}) => {
  const raw = String(value || "").trim();
  if (!raw) return true;

  return Boolean(sanitizeStoredUrl(raw, { allowRelative, allowDataImage }));
};

const getInvalidCourseUrlMessage = ({ thumbnail, recordedVideoUrl, videoSources, liveClassUrl, classSections, pdfUrl, offerImage, offerLink }) => {
  if (!isAllowedUrlValue(thumbnail, { allowRelative: true, allowDataImage: true })) {
    return "Thumbnail URL invalid hai. Real image URL, /local-path, ya uploaded image use karo.";
  }
  if (!isAllowedUrlValue(recordedVideoUrl)) {
    return "Recorded lecture URL invalid ya demo link hai. Real video URL save karo.";
  }
  if ((videoSources || []).some((item) => !isAllowedUrlValue(item.url))) {
    return "Video quality URLs me invalid/demo link hai. Har quality ke saath real URL hi save hoga.";
  }
  if (!isAllowedUrlValue(liveClassUrl)) {
    return "Live class URL invalid ya demo link hai. Real live class URL save karo.";
  }
  if (!isAllowedUrlValue(pdfUrl)) {
    return "PDF URL invalid ya demo link hai. Real PDF URL save karo.";
  }
  if (!isAllowedUrlValue(offerImage, { allowRelative: true })) {
    return "Offer image URL invalid hai. Real image URL ya /local-image path use karo.";
  }
  if (!isAllowedUrlValue(offerLink)) {
    return "Offer link invalid ya demo link hai. Real page URL save karo.";
  }

  const invalidSection = (classSections || []).find((section) =>
    (section.items || []).some(
      (item) => !isAllowedUrlValue(item.href) || !isAllowedUrlValue(item.pdfUrl || item.pdf || item.notesUrl)
    )
  );

  if (invalidSection) {
    return `Class section "${invalidSection.title}" me invalid/demo URL hai. Real class/PDF URL hi save hoga.`;
  }

  return "";
};

const sanitizeStoredClassSections = (sections = []) =>
  (sections || []).map((section) => ({
    ...section,
    items: (section.items || []).map((item) => ({
      ...item,
      href: sanitizeStoredUrl(item.href)
    }))
  }));

const sanitizeStoredCourseRecord = (course = {}) => ({
  ...course,
  thumbnail: sanitizeStoredUrl(course.thumbnail, { allowRelative: true, allowDataImage: true }),
  recordedVideoUrl: sanitizeStoredUrl(course.recordedVideoUrl),
  videoSources: (Array.isArray(course.videoSources) ? course.videoSources : [])
    .map((item) => ({ ...item, url: sanitizeStoredUrl(item.url) }))
    .filter((item) => item.url),
  liveClassUrl: sanitizeStoredUrl(course.liveClassUrl),
  classSections: sanitizeStoredClassSections(course.classSections || []),
  pdfResources: (Array.isArray(course.pdfResources) ? course.pdfResources : [])
    .map((pdf) => ({ ...pdf, url: sanitizeStoredUrl(pdf.url) }))
    .filter((pdf) => pdf.url)
});

const sanitizeStoredPdfMap = (pdfMap = {}) =>
  Object.fromEntries(
    Object.entries(pdfMap || {})
      .map(([courseId, items]) => [
        courseId,
        (Array.isArray(items) ? items : [])
          .map((item) => ({ ...item, url: sanitizeStoredUrl(item.url) }))
          .filter((item) => item.url)
      ])
      .filter(([, items]) => items.length)
  );

const cleanupInvalidStoredUrls = () => {
  if (typeof window === "undefined") return;

  const localCourses = readLocalCourses();
  const cleanedCourses = localCourses.map((course) => sanitizeStoredCourseRecord(course));
  if (JSON.stringify(cleanedCourses) !== JSON.stringify(localCourses)) {
    writeLocalCourses(cleanedCourses);
  }

  const localPdfs = readLocalPdfs();
  const cleanedPdfs = sanitizeStoredPdfMap(localPdfs);
  if (JSON.stringify(cleanedPdfs) !== JSON.stringify(localPdfs)) {
    writeLocalPdfs(cleanedPdfs);
  }

  const banner = getOfferBanner();
  if (banner) {
    const cleanedBanner = {
      ...banner,
      image: sanitizeStoredUrl(banner.image, { allowRelative: true }),
      link: sanitizeStoredUrl(banner.link)
    };
    if (JSON.stringify(cleanedBanner) !== JSON.stringify(banner)) {
      saveOfferBanner(cleanedBanner);
    }
  }
};

export default function InstructorPage({
  embedded = false,
  initialTab = "Courses",
  hideTitle = false,
  hideTabNav = false,
  forceShowForm = false,
  hideCourseFormToggle = false,
  hidePdfManager = false,
  hideDeleteActions = false
} = {}) {
  const [form, setForm] = useState(initialState);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(forceShowForm ? true : true);
  const [editingId, setEditingId] = useState(null);
  const [editingLocal, setEditingLocal] = useState(false);
  const [sliderItems, setSliderItems] = useState([]);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [scheduleDrafts, setScheduleDrafts] = useState({});
  const [scheduleSavingKey, setScheduleSavingKey] = useState("");
  const [sliderConfig, setSliderConfig] = useState({ order: [], hidden: [], pinned: null, liveNow: [], liveUntil: {}, autoLive: [], autoWindowMinutes: 120, manualLiveMinutes: 120 });
  const [activeTab, setActiveTab] = useState(initialTab);
  const [chatLog, setChatLog] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeSaved, setNoticeSaved] = useState(false);
  const [offerTitle, setOfferTitle] = useState("");
  const [offerText, setOfferText] = useState("");
  const [offerImage, setOfferImage] = useState("");
  const [offerLink, setOfferLink] = useState("");
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [offerSaved, setOfferSaved] = useState(false);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfCourseId, setPdfCourseId] = useState("");
  const [pdfTargetTitle, setPdfTargetTitle] = useState("");
  const [pdfNotice, setPdfNotice] = useState("");
  const [sectionDrafts, setSectionDrafts] = useState(() => buildSectionDraftsFromText(initialState.classSectionsText));
  const pdfUploadRef = useRef(null);
  const pdfTitleInputRef = useRef(null);

  const NOTICE_KEY = "badamclasses_site_notice";

  const loadCourses = async () => {
    try {
      const result = await apiFetch("/instructor/courses");
      setCourses(mergeCoursesWithLocalPdfs(buildMergedCourses(Array.isArray(result) ? result : [])));
      setError("");
    } catch (error) {
      const merged = buildMergedCourses([]);
      if (merged.length) {
        setError("Backend unavailable. Showing local saved batches.");
        setCourses(mergeCoursesWithLocalPdfs(merged));
        return;
      }
      setError("Instructor service unavailable. Showing sample batches.");
      setCourses(mergeCoursesWithLocalPdfs(buildMergedCourses([])));
    }
  };

  const refreshFromLocalSources = () => {
    setCourses(mergeCoursesWithLocalPdfs(buildMergedCourses([])));
  };

  useEffect(() => {
    cleanupInvalidStoredUrls();
    loadCourses();
  }, []);

  useEffect(() => {
    const merged = dedupeByBatchKey([...courses, ...batches]).map((item) => normalizeCourse(item));
    setScheduleItems(
      merged.map((item) => ({
        key: makeBatchKey(item),
        title: item.title,
        category: item.category || "General",
        startTime: item.startTime || "",
        endTime: item.endTime || "",
        batchTime: item.batchTime || "",
        startDate: item.startDate || ""
      }))
    );
    const items = merged.map((item) => ({
      key: makeBatchKey(item),
      title: item.title
    }));
    setSliderItems(items);
    const cfg = getSliderConfig();
    if (!cfg.order?.length) {
      cfg.order = items.map((i) => i.key);
    }
    if (!cfg.autoWindowMinutes) cfg.autoWindowMinutes = 120;
    if (!cfg.manualLiveMinutes) cfg.manualLiveMinutes = 120;
    if (!cfg.liveUntil) cfg.liveUntil = {};
    setSliderConfig(cfg);
  }, [courses]);

  useEffect(() => {
    setScheduleDrafts(
      Object.fromEntries(
        scheduleItems.map((item) => [
          item.key,
          {
            startTime: item.startTime || "",
            endTime: item.endTime || ""
          }
        ])
      )
    );
  }, [scheduleItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CHAT_LOG_KEY);
      setChatLog(raw ? JSON.parse(raw) : []);
    } catch {
      setChatLog([]);
    }
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (forceShowForm) {
      setShowForm(true);
    }
  }, [forceShowForm]);

  useEffect(() => {
    const nextValue = stringifySectionDrafts(sectionDrafts);
    setForm((current) => (
      current.classSectionsText === nextValue
        ? current
        : { ...current, classSectionsText: nextValue }
    ));
  }, [sectionDrafts]);

  const handleThumbnailFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file for the course banner.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        thumbnail: typeof reader.result === "string" ? reader.result : current.thumbnail
      }));
      setError("");
      e.target.value = "";
    };
    reader.onerror = () => {
      setError("Banner image could not be read. Please try another file.");
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const updateSectionDraft = (sectionId, field, value) => {
    setSectionDrafts((current) =>
      current.map((section) => (section.id === sectionId ? { ...section, [field]: value } : section))
    );
  };

  const addSectionDraft = () => {
    setSectionDrafts((current) => [...current, createEmptySectionDraft(`Section ${current.length + 1}`)]);
  };

  const removeSectionDraft = (sectionId) => {
    setSectionDrafts((current) => {
      const next = current.filter((section) => section.id !== sectionId);
      return next.length ? next : [createEmptySectionDraft("")];
    });
  };

  const addClassDraft = (sectionId) => {
    setSectionDrafts((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, items: [...section.items, createEmptyClassDraft()] }
          : section
      )
    );
  };

  const updateClassDraft = (sectionId, itemIndex, field, value) => {
    setSectionDrafts((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item, index) => (index === itemIndex ? { ...item, [field]: value } : item))
            }
          : section
      )
    );
  };

  const removeClassDraft = (sectionId, itemIndex) => {
    setSectionDrafts((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;
        const nextItems = section.items.filter((_, index) => index !== itemIndex);
        return { ...section, items: nextItems.length ? nextItems : [createEmptyClassDraft()] };
      })
    );
  };

  const handleQuickPdfUpload = (course) => {
    setPdfCourseId(String(course._id || course.id || ""));
    setPdfTitle(course.title ? `${course.title} Notes` : "");
    setPdfTargetTitle(course.title || "");
    setPdfNotice(`PDF upload ready for ${course.title}. Title aur link add karke save karo.`);
    setError("");
    setActiveTab("Courses");
    setTimeout(() => {
      if (pdfUploadRef.current) {
        const top = pdfUploadRef.current.getBoundingClientRect().top + window.scrollY - 24;
        window.scrollTo({ top, behavior: "smooth" });
      } else if (typeof window !== "undefined") {
        window.location.hash = "pdf-upload";
      }
      if (pdfTitleInputRef.current) {
        pdfTitleInputRef.current.focus();
        pdfTitleInputRef.current.select?.();
      }
    }, 0);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const batchTime = buildBatchTimeLabel(form.startTime, form.endTime, form.batchTime);
    const classSections = parseClassSectionsText(form.classSectionsText);
    const videoSources = parseVideoQualityText(form.videoQualityText);
    const invalidMessage = getInvalidCourseUrlMessage({
      thumbnail: form.thumbnail,
      recordedVideoUrl: form.recordedVideoUrl,
      videoSources,
      liveClassUrl: form.liveClassUrl,
      classSections
    });
    if (invalidMessage) {
      setError(invalidMessage);
      return;
    }
    try {
          await apiFetch("/instructor/courses", {
            method: "POST",
            body: JSON.stringify({
              ...form,
              price: Number(form.price),
              offerPrice: form.offerPrice ? Number(form.offerPrice) : null,
              discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
              offerLabel: form.offerLabel || null,
              startTime: form.startTime || null,
              endTime: form.endTime || null,
              batchTime: batchTime || null,
              startDate: form.startDate || null,
              recordedVideoUrl: form.recordedVideoUrl || null,
              videoSources,
              liveClassUrl: form.liveClassUrl || null,
              classTiming: form.classTiming || null,
              curriculum: form.curriculum.split("\n").filter(Boolean),
              classSections
            })
          });
      setForm(initialState);
      setSectionDrafts(buildSectionDraftsFromText(initialState.classSectionsText));
      await loadCourses();
    } catch (error) {
        const newCourse = {
          _id: `local-${Date.now()}`,
          title: form.title,
          description: form.description,
          price: Number(form.price),
          offerPrice: form.offerPrice ? Number(form.offerPrice) : null,
          discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
          offerLabel: form.offerLabel || null,
          startTime: form.startTime || null,
          endTime: form.endTime || null,
          batchTime: batchTime || null,
          startDate: form.startDate || null,
          category: form.category,
          thumbnail: form.thumbnail,
          recordedVideoUrl: form.recordedVideoUrl || null,
          videoSources,
          liveClassUrl: form.liveClassUrl || null,
          classTiming: form.classTiming || null,
          curriculum: form.curriculum.split("\n").filter(Boolean),
          classSections,
          videos: [],
          pdfResources: []
        };
      const updated = [newCourse, ...readLocalCourses()];
      try {
        writeLocalCourses(updated);
        removeDeletedCourseKey(newCourse);
        setCourses(mergeCoursesWithLocalPdfs(buildMergedCourses(updated)));
        setError("Backend unavailable. Saved locally in this browser.");
        setForm(initialState);
        setSectionDrafts(buildSectionDraftsFromText(initialState.classSectionsText));
      } catch {
        setError("Local storage is full. Replace the banner image URL or delete old local batches, then try again.");
      }
    }
  };

  const handleEdit = (course) => {
    const schedule = getCourseSchedule(course);
    setShowForm(true);
    setEditingId(course._id);
    setEditingLocal(String(course._id || "").startsWith("local-"));
    setForm({
      title: course.title || "",
      description: course.description || "",
      price: String(course.price || ""),
      offerPrice: course.offerPrice ? String(course.offerPrice) : "",
      discountPercent: course.discountPercent ? String(course.discountPercent) : "",
      offerLabel: course.offerLabel || "",
      startTime: schedule.startTime || "",
      endTime: schedule.endTime || "",
      batchTime: schedule.batchTime || "",
      startDate: course.startDate || "",
      category: course.category || "",
      thumbnail: course.thumbnail || "",
      recordedVideoUrl: course.recordedVideoUrl || "",
      videoQualityText: stringifyVideoQualityText(course.videoSources || []),
      liveClassUrl: course.liveClassUrl || "",
      classTiming: course.classTiming || "",
      curriculum: Array.isArray(course.curriculum) ? course.curriculum.join("\n") : "",
      classSectionsText: stringifyClassSections(course.classSections || [])
    });
    setSectionDrafts(buildSectionDraftsFromText(stringifyClassSections(course.classSections || [])));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    const batchTime = buildBatchTimeLabel(form.startTime, form.endTime, form.batchTime);
    const classSections = parseClassSectionsText(form.classSectionsText);
    const videoSources = parseVideoQualityText(form.videoQualityText);
    const invalidMessage = getInvalidCourseUrlMessage({
      thumbnail: form.thumbnail,
      recordedVideoUrl: form.recordedVideoUrl,
      videoSources,
      liveClassUrl: form.liveClassUrl,
      classSections
    });
    if (invalidMessage) {
      setError(invalidMessage);
      return;
    }

    const payload = {
      ...form,
      price: Number(form.price),
      offerPrice: form.offerPrice ? Number(form.offerPrice) : null,
      discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
      offerLabel: form.offerLabel || null,
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      batchTime: batchTime || null,
      startDate: form.startDate || null,
      recordedVideoUrl: form.recordedVideoUrl || null,
      videoSources,
      liveClassUrl: form.liveClassUrl || null,
      classTiming: form.classTiming || null,
      curriculum: form.curriculum.split("\n").filter(Boolean),
      classSections
    };

    if (editingLocal) {
      const updated = readLocalCourses().map((item) =>
        item._id === editingId ? { ...item, ...payload } : item
      );
      try {
        writeLocalCourses(updated);
        setCourses(mergeCoursesWithLocalPdfs(buildMergedCourses(updated)));
        setError("Updated locally in this browser.");
        setForm(initialState);
        setSectionDrafts(buildSectionDraftsFromText(initialState.classSectionsText));
        setEditingId(null);
        setEditingLocal(false);
      } catch {
        setError("Local storage is full. Replace the banner image URL or delete old local batches, then try again.");
      }
      return;
    }

    try {
      await apiFetch(`/instructor/courses/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setForm(initialState);
      setSectionDrafts(buildSectionDraftsFromText(initialState.classSectionsText));
      setEditingId(null);
      setEditingLocal(false);
      await loadCourses();
    } catch (err) {
      try {
        const currentCourse = courses.find(
          (course) => String(course._id || course.id || "") === String(editingId)
        );
        const updatedLocalCourses = upsertLocalCourse({
          ...currentCourse,
          ...payload,
          _id: editingId
        });
        setCourses(mergeCoursesWithLocalPdfs(buildMergedCourses(updatedLocalCourses)));
        setError("Backend unavailable. Updated locally in this browser.");
        setForm(initialState);
        setSectionDrafts(buildSectionDraftsFromText(initialState.classSectionsText));
        setEditingId(null);
        setEditingLocal(false);
      } catch {
        setError("Local storage is full. Replace the banner image URL or delete old local batches, then try again.");
      }
    }
  };

  const handleSyncLocal = async () => {
    const localCourses = readLocalCourses();
    const localPdfs = readLocalPdfs();
    if (!localCourses.length && Object.keys(localPdfs).length === 0) {
      setError("No local courses to sync.");
      return;
    }

    setSyncing(true);
    try {
      for (const course of localCourses) {
        const body = JSON.stringify({
          title: course.title,
          description: course.description,
          price: Number(course.price || 0),
          offerPrice: course.offerPrice || null,
          discountPercent: course.discountPercent || null,
          offerLabel: course.offerLabel || null,
          startTime: course.startTime || null,
          endTime: course.endTime || null,
          batchTime: course.batchTime || null,
          startDate: course.startDate || null,
          recordedVideoUrl: course.recordedVideoUrl || null,
          liveClassUrl: course.liveClassUrl || null,
          classTiming: course.classTiming || null,
          category: course.category,
          thumbnail: course.thumbnail,
          curriculum: Array.isArray(course.curriculum) ? course.curriculum : [],
          classSections: Array.isArray(course.classSections) ? course.classSections : []
        });

        if (String(course._id || "").startsWith("local-")) {
          await apiFetch("/instructor/courses", {
            method: "POST",
            body
          });
        } else {
          await apiFetch(`/instructor/courses/${course._id}`, {
            method: "PATCH",
            body
          });
        }
      }
      for (const [courseId, pdfs] of Object.entries(localPdfs)) {
        for (const pdf of pdfs) {
          await apiFetch(`/instructor/courses/${courseId}/pdf`, {
            method: "POST",
            body: JSON.stringify({ title: pdf.title, url: pdf.url })
          });
        }
      }
      writeLocalCourses([]);
      writeLocalPdfs({});
      writeDeletedCourseKeys([]);
      setError("");
      await loadCourses();
    } catch (err) {
      setError("Backend still unavailable. Local courses kept.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (course) => {
    if (!confirm("Delete this course?")) {
      return;
    }

    const isLocal = String(course._id || "").startsWith("local-");
    if (isLocal) {
      const updated = readLocalCourses().filter((item) => item._id !== course._id);
      writeLocalCourses(updated);
      removeLocalPdfsForCourse(course._id);
      removeDeletedCourseKey(course);
      setCourses(mergeCoursesWithLocalPdfs(buildMergedCourses(updated)));
      setError(updated.length ? "Backend unavailable. Showing local saved batches." : "");
      return;
    }

    try {
      await apiFetch(`/instructor/courses/${course._id}`, { method: "DELETE" });
      removeLocalPdfsForCourse(course._id);
      removeDeletedCourseKey(course);
      await loadCourses();
    } catch (err) {
      addDeletedCourseKey(course);
      removeLocalPdfsForCourse(course._id);
      refreshFromLocalSources();
      setError("Backend unavailable. Batch removed locally in this browser.");
    }
  };

  const handleAddPdf = async (e) => {
    e.preventDefault();
    const hasPdfUrl = Boolean(pdfUrl.trim());
    const hasPdfFile = Boolean(pdfFile);
    if (!pdfTitle.trim() || !pdfCourseId || (!hasPdfUrl && !hasPdfFile)) return;
    if (hasPdfFile && pdfFile.type !== "application/pdf") {
      setError("Only PDF files can be uploaded.");
      return;
    }
    const invalidMessage = hasPdfUrl ? getInvalidCourseUrlMessage({ pdfUrl }) : "";
    if (invalidMessage) {
      setError(invalidMessage);
      return;
    }
    const targetId = pdfCourseId;
    const selectedCourse = courses.find(
      (course) => String(course._id || course.id || "") === String(targetId)
    );
    let resolvedPdfUrl = pdfUrl.trim();

    if (hasPdfFile) {
      const formData = new FormData();
      formData.append("file", pdfFile);
      setPdfUploading(true);
      try {
        const uploadResult = await apiFetch("/upload", {
          method: "POST",
          body: formData
        });
        resolvedPdfUrl = String(uploadResult?.url || "").trim();
      } catch (uploadError) {
        setPdfUploading(false);
        setError(uploadError?.message || "PDF upload failed. Please try again.");
        return;
      }
      setPdfUploading(false);
    }

    const payload = {
      title: pdfTitle.trim(),
      url: resolvedPdfUrl,
      courseTitle: selectedCourse?.title || ""
    };

    // Try backend first
    try {
      await apiFetch(`/instructor/courses/${targetId}/pdf`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setPdfTitle("");
      setPdfUrl("");
      setPdfFile(null);
      setPdfTargetTitle(selectedCourse?.title || "");
      setPdfNotice(`PDF saved for ${selectedCourse?.title || "selected batch"}.`);
      setError("");
      await loadCourses();
      return;
    } catch (err) {
      // fall through to local storage
    }

    const localPdfs = readLocalPdfs();
    const list = localPdfs[targetId] || [];
    localPdfs[targetId] = [
      ...list,
      { title: payload.title, url: payload.url, courseTitle: payload.courseTitle }
    ];
    writeLocalPdfs(localPdfs);
    refreshFromLocalSources();
    setPdfTitle("");
    setPdfUrl("");
    setPdfFile(null);
    setPdfTargetTitle(selectedCourse?.title || "");
    setPdfNotice(`PDF saved locally for ${selectedCourse?.title || "selected batch"}.`);
    setError("Backend unavailable. PDF saved locally in this browser.");
  };

  const handleDeletePdf = (courseId, idx) => {
    const localPdfs = readLocalPdfs();
    const list = [...(localPdfs[String(courseId)] || [])];
    list.splice(idx, 1);
    localPdfs[String(courseId)] = list;
    writeLocalPdfs(localPdfs);
    refreshFromLocalSources();
    setError("Updated locally in this browser.");
  };

  const updateSliderConfig = (nextConfig) => {
    setSliderConfig(nextConfig);
    saveSliderConfig(nextConfig);
  };

  const moveItem = (key, direction) => {
    const order = sliderConfig.order.length ? [...sliderConfig.order] : sliderItems.map((i) => i.key);
    const index = order.indexOf(key);
    if (index === -1) return;
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const swapped = [...order];
    [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
    updateSliderConfig({ ...sliderConfig, order: swapped });
  };

  const toggleHidden = (key) => {
    const hidden = new Set(sliderConfig.hidden || []);
    if (hidden.has(key)) hidden.delete(key);
    else hidden.add(key);
    updateSliderConfig({ ...sliderConfig, hidden: Array.from(hidden) });
  };

  const pinFirst = (key) => {
    updateSliderConfig({ ...sliderConfig, pinned: sliderConfig.pinned === key ? null : key });
  };

  const toggleLiveNow = (key) => {
    const liveNow = new Set(sliderConfig.liveNow || []);
    const liveUntil = { ...(sliderConfig.liveUntil || {}) };
    if (liveNow.has(key)) {
      liveNow.delete(key);
      delete liveUntil[key];
    } else {
      liveNow.add(key);
      liveUntil[key] = new Date(Date.now() + (sliderConfig.manualLiveMinutes || 120) * 60000).toISOString();
    }
    updateSliderConfig({ ...sliderConfig, liveNow: Array.from(liveNow), liveUntil });
  };

  const startLiveNow = (key) => {
    const liveNow = new Set(sliderConfig.liveNow || []);
    liveNow.add(key);
    const liveUntil = { ...(sliderConfig.liveUntil || {}) };
    liveUntil[key] = new Date(Date.now() + (sliderConfig.manualLiveMinutes || 120) * 60000).toISOString();
    updateSliderConfig({ ...sliderConfig, liveNow: Array.from(liveNow), liveUntil, pinned: key });
  };

  const stopLiveNow = (key) => {
    const liveNow = new Set(sliderConfig.liveNow || []);
    liveNow.delete(key);
    const liveUntil = { ...(sliderConfig.liveUntil || {}) };
    delete liveUntil[key];
    updateSliderConfig({ ...sliderConfig, liveNow: Array.from(liveNow), liveUntil });
  };

  const toggleAutoLive = (key) => {
    const autoLive = new Set(sliderConfig.autoLive || []);
    if (autoLive.has(key)) autoLive.delete(key);
    else autoLive.add(key);
    updateSliderConfig({ ...sliderConfig, autoLive: Array.from(autoLive) });
  };

  const clearChatLog = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(CHAT_LOG_KEY);
    setChatLog([]);
  };

  const sendAdminReply = () => {
    if (!replyText.trim() || typeof window === "undefined") return;
    const msg = {
      role: "assistant",
      content: `Admin: ${replyText.trim()}`,
      time: new Date().toISOString()
    };
    const next = [msg, ...chatLog];
    window.localStorage.setItem(CHAT_LOG_KEY, JSON.stringify(next));
    setChatLog(next);
    setReplyText("");
  };
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NOTICE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setNoticeTitle(data.title || "");
        setNoticeMessage(data.message || "");
      }
    } catch {
      // ignore
    }
  }, []);

  const saveNotice = () => {
    const data = { title: noticeTitle, message: noticeMessage };
    window.localStorage.setItem(NOTICE_KEY, JSON.stringify(data));
    setNoticeSaved(true);
    setTimeout(() => setNoticeSaved(false), 2000);
  };

  useEffect(() => {
    const banner = getOfferBanner();
    if (banner) {
      setOfferTitle(banner.title || "");
      setOfferText(banner.text || "");
      setOfferImage(banner.image || "");
      setOfferLink(banner.link || "");
      setOfferEnabled(Boolean(banner.enabled));
    }
  }, []);

  const saveOffer = () => {
    const invalidMessage = getInvalidCourseUrlMessage({ offerImage, offerLink });
    if (invalidMessage) {
      setError(invalidMessage);
      return;
    }
    saveOfferBanner({
      title: offerTitle,
      text: offerText,
      image: offerImage,
      link: offerLink,
      enabled: offerEnabled
    });
    setOfferSaved(true);
    setTimeout(() => setOfferSaved(false), 2000);
  };

  const updateScheduleDraft = (key, field, value) => {
    setScheduleDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        [field]: value
      }
    }));
  };

  const saveScheduleTiming = async (item) => {
    const draft = scheduleDrafts[item.key] || {};
    const startTime = String(draft.startTime || "").trim();
    const endTime = String(draft.endTime || "").trim();
    const batchTime = buildBatchTimeLabel(startTime, endTime, item.batchTime);

    const matchedCourse =
      courses.find(
        (course) =>
          makeBatchKey(course) === item.key ||
          String(course.title || "").trim().toLowerCase() === String(item.title || "").trim().toLowerCase()
      ) ||
      normalizeCourse(
        batches.find(
          (batch) =>
            makeBatchKey(batch) === item.key ||
            String(batch.title || "").trim().toLowerCase() === String(item.title || "").trim().toLowerCase()
        ) || {
          _id: item.key,
          title: item.title,
          category: item.category,
          startDate: item.startDate
        }
      );

    const payload = {
      title: matchedCourse.title,
      description: matchedCourse.description || "",
      price: Number(matchedCourse.price || matchedCourse.priceValue || 0),
      offerPrice: matchedCourse.offerPrice || null,
      discountPercent: matchedCourse.discountPercent || null,
      offerLabel: matchedCourse.offerLabel || null,
      startTime: startTime || null,
      endTime: endTime || null,
      batchTime: batchTime || null,
      startDate: matchedCourse.startDate || item.startDate || null,
      recordedVideoUrl: matchedCourse.recordedVideoUrl || null,
      liveClassUrl: matchedCourse.liveClassUrl || null,
      classTiming: matchedCourse.classTiming || null,
      category: matchedCourse.category || item.category || "",
      thumbnail: resolveCourseImage(matchedCourse),
      curriculum: Array.isArray(matchedCourse.curriculum) ? matchedCourse.curriculum : [],
      classSections: Array.isArray(matchedCourse.classSections) ? matchedCourse.classSections : []
    };

    setScheduleSavingKey(item.key);
    try {
      if (matchedCourse._id && !String(matchedCourse._id).startsWith("local-")) {
        await apiFetch(`/instructor/courses/${matchedCourse._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        await loadCourses();
      } else {
        try {
          const updatedLocalCourses = upsertLocalCourse({
            ...matchedCourse,
            _id: matchedCourse._id || item.key,
            ...payload
          });
          setCourses(mergeCoursesWithLocalPdfs(buildMergedCourses(updatedLocalCourses)));
          setError("Batch timing updated locally in this browser.");
        } catch {
          setError("Local storage is full. Replace the banner image URL or delete old local batches, then try again.");
        }
      }
    } catch (err) {
      try {
        const updatedLocalCourses = upsertLocalCourse({
          ...matchedCourse,
          _id: matchedCourse._id || item.key,
          ...payload
        });
        setCourses(mergeCoursesWithLocalPdfs(buildMergedCourses(updatedLocalCourses)));
        setError("Backend unavailable. Batch timing updated locally in this browser.");
      } catch {
        setError("Local storage is full. Replace the banner image URL or delete old local batches, then try again.");
      }
    } finally {
      setScheduleSavingKey("");
    }
  };

  const editBatchFromSchedule = (item) => {
    const matchedCourse =
      courses.find(
        (course) =>
          makeBatchKey(course) === item.key ||
          String(course.title || "").trim().toLowerCase() === String(item.title || "").trim().toLowerCase()
      ) ||
      normalizeCourse(
        batches.find(
          (batch) =>
            makeBatchKey(batch) === item.key ||
            String(batch.title || "").trim().toLowerCase() === String(item.title || "").trim().toLowerCase()
        ) || {
          _id: item.key,
          title: item.title,
          category: item.category,
          batchTime: item.batchTime,
          startDate: item.startDate
        }
      );

    handleEdit(matchedCourse);
    setActiveTab("Courses");
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.location.hash = "new-course";
      }
    }, 0);
  };

  const Wrapper = embedded ? "div" : "main";

  return (
    <Wrapper className={embedded ? "w-full" : "mx-auto w-[92%] max-w-6xl py-10"}>
      {hideTitle ? null : <h1 className="mb-6 font-display text-4xl">Instructor / Admin Panel</h1>}
      {error ? (
        <div className="mb-4 rounded-xl border border-orange-300/40 bg-orange-500/10 p-4 text-sm text-orange-100">
          {error}
        </div>
      ) : null}

      {hideTabNav ? null : (
        <div className="mb-6 flex flex-wrap gap-2">
          {["Courses", "Live Controls", "Offer & Notice", "Live Chat"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "border-orange-300/60 bg-orange-500/15 text-orange-100"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-orange-300/40"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {activeTab === "Courses" ? (
        <>
      {hideCourseFormToggle ? (
        <div id="new-course" className="mb-4">
          <div className="rounded-2xl border border-white/10 bg-[#0b1634]/70 px-4 py-3 text-sm text-slate-300">
            Manage batches, timings, class sections, and pricing from this section.
          </div>
        </div>
      ) : (
        <div id="new-course" className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {showForm ? "Hide New Course Form" : "Add New Course"}
          </button>
          <span className="text-xs text-slate-400">This button is only on the Admin/Instructor panel.</span>
        </div>
      )}

      {showForm ? (
        <form onSubmit={editingId ? handleUpdate : handleCreate} className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-card/70 p-6 md:grid-cols-2">
          <input required placeholder="Course title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg bg-bg px-3 py-2" />
          <input required placeholder="Price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-lg bg-bg px-3 py-2" />
          <input placeholder="Offer Price" type="number" value={form.offerPrice} onChange={(e) => setForm({ ...form, offerPrice: e.target.value })} className="rounded-lg bg-bg px-3 py-2" />
          <input placeholder="Discount %" type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} className="rounded-lg bg-bg px-3 py-2" />
          <input placeholder="Offer Label (eg: 61% OFF)" value={form.offerLabel} onChange={(e) => setForm({ ...form, offerLabel: e.target.value })} className="rounded-lg bg-bg px-3 py-2" />
          <input placeholder="Start Time (eg: 7:00 PM)" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value, batchTime: buildBatchTimeLabel(e.target.value, form.endTime, form.batchTime) })} className="rounded-lg bg-bg px-3 py-2" />
          <input placeholder="End Time (eg: 8:00 PM)" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value, batchTime: buildBatchTimeLabel(form.startTime, e.target.value, form.batchTime) })} className="rounded-lg bg-bg px-3 py-2" />
          <input placeholder="Class Timing (eg: Mon to Sat, 7:00 PM)" value={form.classTiming} onChange={(e) => setForm({ ...form, classTiming: e.target.value })} className="rounded-lg bg-bg px-3 py-2" />
          <input placeholder="Start Date (eg: 15 Apr 2026)" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-lg bg-bg px-3 py-2" />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg bg-bg px-3 py-2" />
          <div className="grid gap-2 md:col-span-2">
            <input placeholder="Thumbnail URL" value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} className="rounded-lg bg-bg px-3 py-2" />
            <label className="rounded-lg border border-dashed border-white/15 bg-[#0b1634]/70 px-3 py-3 text-sm text-slate-300">
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-400">Upload Banner Image</span>
              <input type="file" accept="image/*" onChange={handleThumbnailFileChange} className="block w-full text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-white" />
            </label>
            {form.thumbnail ? (
              <div className="flex flex-wrap items-start gap-3 rounded-xl border border-white/10 bg-[#0b1634]/70 p-3">
                <img src={form.thumbnail} alt="Banner preview" className="h-24 w-20 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Banner Preview</p>
                  <p className="mt-2 text-xs text-slate-300">This image will be used as the batch banner/card image.</p>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, thumbnail: "" })}
                    className="mt-3 rounded-lg border border-rose-300/40 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
                  >
                    Remove Banner
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <input placeholder="Recorded Lecture URL" value={form.recordedVideoUrl} onChange={(e) => setForm({ ...form, recordedVideoUrl: e.target.value })} className="rounded-lg bg-bg px-3 py-2 md:col-span-2" />
          <textarea
            placeholder={"Video Quality URLs (optional)\n240 | https://...\n360 | https://...\n420 | https://...\n720 | https://...\n1080 | https://..."}
            value={form.videoQualityText}
            onChange={(e) => setForm({ ...form, videoQualityText: e.target.value })}
            className="min-h-[130px] rounded-lg bg-bg px-3 py-2 md:col-span-2"
          />
          <input placeholder="Live Class Link" value={form.liveClassUrl} onChange={(e) => setForm({ ...form, liveClassUrl: e.target.value })} className="rounded-lg bg-bg px-3 py-2 md:col-span-2" />
          <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg bg-bg px-3 py-2 md:col-span-2" />
          <textarea placeholder="Curriculum (one line each)" value={form.curriculum} onChange={(e) => setForm({ ...form, curriculum: e.target.value })} className="rounded-lg bg-bg px-3 py-2 md:col-span-2" />
          <div className="grid gap-4 rounded-2xl border border-white/10 bg-[#0b1634]/60 p-4 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Section Builder</p>
                <p className="text-xs text-slate-400">Visual tareeke se section aur class add karo. Raw format yaad rakhne ki zarurat nahi.</p>
              </div>
              <button
                type="button"
                onClick={addSectionDraft}
                className="rounded-xl border border-orange-300/40 px-3 py-2 text-xs font-semibold text-orange-200 hover:bg-orange-500/20"
              >
                Add Section
              </button>
            </div>

            <div className="space-y-4">
              {sectionDrafts.map((section) => (
                <div key={section.id} className="rounded-2xl border border-white/10 bg-bg/70 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <input
                      placeholder="Section Name (eg: Arithmetic / Advance / Reasoning)"
                      value={section.title}
                      onChange={(e) => updateSectionDraft(section.id, "title", e.target.value)}
                      className="min-w-[260px] flex-1 rounded-lg bg-[#0b1634] px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => addClassDraft(section.id)}
                      className="rounded-lg border border-cyan-300/40 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
                    >
                      Add Class
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSectionDraft(section.id)}
                      className="rounded-lg border border-rose-300/40 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
                    >
                      Remove Section
                    </button>
                  </div>

                  <div className="space-y-3">
                    {section.items.map((item, itemIndex) => (
                      <div key={`${section.id}-${itemIndex}`} className="grid gap-3 rounded-xl border border-white/10 bg-[#0b1634]/80 p-3 md:grid-cols-2">
                        <input
                          placeholder="Class Title"
                          value={item.title}
                          onChange={(e) => updateClassDraft(section.id, itemIndex, "title", e.target.value)}
                          className="rounded-lg bg-bg px-3 py-2"
                        />
                        <input
                          placeholder="Subtitle / Timing"
                          value={item.subtitle}
                          onChange={(e) => updateClassDraft(section.id, itemIndex, "subtitle", e.target.value)}
                          className="rounded-lg bg-bg px-3 py-2"
                        />
                        <input
                          placeholder="Class URL"
                          value={item.href}
                          onChange={(e) => updateClassDraft(section.id, itemIndex, "href", e.target.value)}
                          className="rounded-lg bg-bg px-3 py-2 md:col-span-2"
                        />
                        <input
                          placeholder="Button Label"
                          value={item.actionLabel}
                          onChange={(e) => updateClassDraft(section.id, itemIndex, "actionLabel", e.target.value)}
                          className="rounded-lg bg-bg px-3 py-2"
                        />
                        <div className="flex gap-3">
                          <input
                            placeholder="Icon"
                            value={item.icon}
                            onChange={(e) => updateClassDraft(section.id, itemIndex, "icon", e.target.value)}
                            className="w-28 rounded-lg bg-bg px-3 py-2"
                          />
                          <button
                            type="button"
                            onClick={() => removeClassDraft(section.id, itemIndex)}
                            className="rounded-lg border border-rose-300/40 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
                          >
                            Remove Class
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <details className="rounded-xl border border-white/10 bg-[#081127]/80 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">Advanced Raw Format</summary>
              <textarea
                placeholder="Sections & Classes: one class per line. Format: Section Name | Class Title | Subtitle/Timing | URL | Button Label | Icon"
                value={form.classSectionsText}
                onChange={(e) => {
                  setForm({ ...form, classSectionsText: e.target.value });
                  setSectionDrafts(buildSectionDraftsFromText(e.target.value));
                }}
                className="mt-3 min-h-32 w-full rounded-lg bg-bg px-3 py-2"
              />
            </details>
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button className="rounded-xl bg-accent px-4 py-2 font-semibold">
              {editingId ? "Save Changes" : "Save Batch"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setEditingLocal(false);
                  setForm(initialState);
                  setSectionDrafts(buildSectionDraftsFromText(initialState.classSectionsText));
                }}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:border-orange-300/50"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {hidePdfManager ? null : (
      <form id="pdf-upload" ref={pdfUploadRef} onSubmit={handleAddPdf} className="mb-8 grid gap-3 rounded-2xl border border-white/10 bg-card/70 p-6 md:grid-cols-3">
        <div className="md:col-span-3">
          <h3 className="font-display text-xl">Upload PDF Notes</h3>
          <p className="text-xs text-slate-400">Choose a batch, upload a PDF or paste a PDF link, and save. Har batch card se direct Upload PDF button bhi available hai.</p>
          {pdfNotice ? (
            <div className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100">
              {pdfNotice}
            </div>
          ) : null}
          {pdfTargetTitle ? (
            <div className="mt-3 inline-flex rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100">
              Selected batch: {pdfTargetTitle}
            </div>
          ) : null}
        </div>
        <select
          required
          value={pdfCourseId}
          onChange={(e) => {
            const nextId = e.target.value;
            setPdfCourseId(nextId);
            const matched = courses.find((course) => String(course._id || course.id || "") === String(nextId));
            setPdfTargetTitle(matched?.title || "");
            setPdfNotice(matched?.title ? `PDF upload ready for ${matched.title}. Title aur link add karke save karo.` : "");
          }}
          className="rounded-lg bg-bg px-3 py-2 text-sm"
        >
          <option value="">Select batch</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.title}
            </option>
          ))}
        </select>
        <input
          required
          ref={pdfTitleInputRef}
          placeholder="PDF Title"
          value={pdfTitle}
          onChange={(e) => setPdfTitle(e.target.value)}
          className="rounded-lg bg-bg px-3 py-2 text-sm"
        />
        <input
          placeholder="PDF URL (Drive/Cloudinary link)"
          value={pdfUrl}
          onChange={(e) => setPdfUrl(e.target.value)}
          className="rounded-lg bg-bg px-3 py-2 text-sm md:col-span-1"
        />
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          className="rounded-lg bg-bg px-3 py-2 text-sm md:col-span-3"
        />
        <div className="md:col-span-3">
          <button disabled={pdfUploading} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
            {pdfUploading ? "Uploading PDF..." : "Add PDF to Batch"}
          </button>
        </div>
      </form>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSyncLocal}
          disabled={syncing}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-accent/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {syncing ? "Syncing..." : "Sync Local Courses to Backend"}
        </button>
        <span className="text-xs text-slate-400">Use this after the backend is running to move local courses into the database.</span>
      </div>

      <div id="manage-courses" className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => {
          const isPdfTarget = String(course._id || course.id || "") === String(pdfCourseId || "");
          return (
          <div
            key={course._id}
            className={`rounded-xl border bg-card/70 p-5 transition ${isPdfTarget ? "border-cyan-300/50 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]" : "border-white/10"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">{course.title}</h2>
                <p className="text-slate-300">&#x20B9;{Number(course.price || 0).toLocaleString("en-IN")}</p>
                <p className="text-sm text-slate-400">Videos: {course.videos?.length || 0} | PDFs: {course.pdfResources?.length || 0}</p>
                <p className="text-sm text-slate-400">Sections: {course.classSections?.length || 0}</p>
                <p className="text-sm text-slate-400">Batch Timing: {course.batchTime || "Not added"}</p>
                <p className="text-sm text-slate-400">Class Timing: {course.classTiming || "Not added"}</p>
                {isPdfTarget ? (
                  <p className="mt-3 inline-flex rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                    PDF form ready below for this batch
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleEdit(course)}
                  className="rounded-lg border border-orange-300/40 px-3 py-1 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/20"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPdfUpload(course)}
                  className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${isPdfTarget ? "border-cyan-200 bg-cyan-500/20 text-cyan-50" : "border-cyan-300/40 text-cyan-200 hover:bg-cyan-500/20"}`}
                >
                  {isPdfTarget ? "PDF Ready" : "Upload PDF"}
                </button>
                {hideDeleteActions ? null : (
                  <button
                    onClick={() => handleDelete(course)}
                    className="rounded-lg border border-rose-300/40 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            {course.pdfResources?.length ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-slate-400">PDF Notes</p>
                {course.pdfResources.map((pdf, idx) => (
                  <div key={`${course._id}-pdf-${idx}`} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0b1634]/70 px-3 py-2 text-xs text-slate-200">
                    <span className="truncate">{pdf.title || "PDF Note"}</span>
                    <div className="flex items-center gap-2">
                      {pdf.url ? (
                        <a href={pdf.url} target="_blank" rel="noreferrer" className="text-orange-200 hover:underline">Open</a>
                      ) : null}
                      {hideDeleteActions ? null : (
                        <button
                          onClick={() => handleDeletePdf(course._id, idx)}
                          className="rounded-md border border-rose-300/40 px-2 py-0.5 text-[11px] text-rose-200 hover:bg-rose-500/20"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )})}
      </div>
        </>
      ) : null}

      {activeTab === "Live Controls" ? (
      <section className="mt-10 rounded-2xl border border-white/10 bg-card/70 p-6">
        <h2 className="font-display text-2xl">Slider Order & Visibility</h2>
        <p className="mt-1 text-sm text-slate-400">Admin can decide which batch shows first, next, and hidden.</p>
        <div className="mt-4 rounded-xl border border-white/10 bg-[#0b1634]/70 p-4 text-sm text-slate-200">
          <label className="flex flex-wrap items-center gap-3">
            Auto LIVE window (minutes):
            <input
              type="number"
              min="30"
              step="10"
              value={getAutoWindowMinutes(sliderConfig)}
              onChange={(e) =>
                updateSliderConfig({ ...sliderConfig, autoWindowMinutes: Number(e.target.value || 120) })
              }
              className="w-24 rounded-lg bg-bg px-3 py-1 text-white"
            />
            <span className="text-xs text-slate-400">If batch time is set, it becomes LIVE automatically during this window.</span>
          </label>
          <label className="mt-3 flex flex-wrap items-center gap-3">
            Manual LIVE duration (minutes):
            <input
              type="number"
              min="10"
              step="10"
              value={sliderConfig.manualLiveMinutes || 120}
              onChange={(e) =>
                updateSliderConfig({ ...sliderConfig, manualLiveMinutes: Number(e.target.value || 120) })
              }
              className="w-24 rounded-lg bg-bg px-3 py-1 text-white"
            />
            <span className="text-xs text-slate-400">When you press “Start Live Now”, it will auto-end after this time.</span>
          </label>
        </div>

        <div className="mt-4 space-y-3">
          {applySliderConfig(
            sliderItems.map((item) => ({ id: item.key, title: item.title })),
            sliderConfig
          ).map((item) => {
            const key = item.id;
            const isHidden = (sliderConfig.hidden || []).includes(key);
            const isPinned = sliderConfig.pinned === key;
            return (
              <div key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1634]/70 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-slate-400">{isPinned ? "Pinned first" : isHidden ? "Hidden" : "Visible"}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button onClick={() => moveItem(key, -1)} className="rounded-lg border border-white/10 px-3 py-1 text-white/80 hover:border-orange-300/40">Up</button>
                  <button onClick={() => moveItem(key, 1)} className="rounded-lg border border-white/10 px-3 py-1 text-white/80 hover:border-orange-300/40">Down</button>
                  <button onClick={() => pinFirst(key)} className="rounded-lg border border-orange-300/40 px-3 py-1 text-orange-200 hover:bg-orange-500/20">
                    {isPinned ? "Unpin" : "Pin First"}
                  </button>
                  <button onClick={() => toggleLiveNow(key)} className="rounded-lg border border-emerald-300/40 px-3 py-1 text-emerald-200 hover:bg-emerald-500/20">
                    {(sliderConfig.liveNow || []).includes(key) ? "Live Now: ON" : "Live Now: OFF"}
                  </button>
                  <button
                    onClick={() => startLiveNow(key)}
                    className="rounded-lg border border-green-300/40 bg-green-500/10 px-3 py-1 text-green-200 hover:bg-green-500/20"
                  >
                    Start Live Now
                  </button>
                  <button
                    onClick={() => stopLiveNow(key)}
                    className="rounded-lg border border-slate-300/30 px-3 py-1 text-slate-200 hover:border-slate-200/50"
                  >
                    Stop Live
                  </button>
                  <button onClick={() => toggleAutoLive(key)} className="rounded-lg border border-cyan-300/40 px-3 py-1 text-cyan-200 hover:bg-cyan-500/20">
                    {(sliderConfig.autoLive || []).includes(key) ? "Auto Live: ON" : "Auto Live: OFF"}
                  </button>
                  <button onClick={() => toggleHidden(key)} className="rounded-lg border border-rose-300/40 px-3 py-1 text-rose-200 hover:bg-rose-500/20">
                    {isHidden ? "Show" : "Hide"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0b1634]/70 p-5">
          <h3 className="font-display text-xl">Batch Schedule Table</h3>
          <p className="mt-1 text-xs text-slate-400">Shows batch time and start date. Auto-live uses these values.</p>
          <div className="mt-4 overflow-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2">Batch</th>
                  <th>Category</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Start Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {scheduleItems.map((item) => (
                  <tr key={item.key} className="border-t border-white/10">
                    <td className="py-2 text-slate-100">{item.title}</td>
                    <td className="text-slate-300">{item.category}</td>
                    <td className="py-2">
                      <input
                        value={scheduleDrafts[item.key]?.startTime || ""}
                        onChange={(e) => updateScheduleDraft(item.key, "startTime", e.target.value)}
                        placeholder="7:00 PM"
                        className="w-28 rounded-lg bg-bg px-2 py-1 text-xs text-white"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        value={scheduleDrafts[item.key]?.endTime || ""}
                        onChange={(e) => updateScheduleDraft(item.key, "endTime", e.target.value)}
                        placeholder="8:00 PM"
                        className="w-28 rounded-lg bg-bg px-2 py-1 text-xs text-white"
                      />
                    </td>
                    <td className="text-slate-300">{item.startDate || "-"}</td>
                    <td className="py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => saveScheduleTiming(item)}
                          disabled={scheduleSavingKey === item.key}
                          className="rounded-lg border border-emerald-300/40 px-3 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {scheduleSavingKey === item.key ? "Saving..." : "Save Timing"}
                        </button>
                        <button
                          type="button"
                          onClick={() => editBatchFromSchedule(item)}
                          className="rounded-lg border border-orange-300/40 px-3 py-1 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/20"
                        >
                          Edit Batch
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Add start time and end time inline, then press "Save Timing". Use "Edit Batch" for class timing, sections like Advance or Arithmetic, and other batch details.
          </p>
        </div>
      </section>
      ) : null}

      {activeTab === "Offer & Notice" ? (
        <>
      <section className="mt-10 rounded-2xl border border-white/10 bg-card/70 p-6">
        <h2 className="font-display text-2xl">Site Notification</h2>
        <p className="mt-1 text-sm text-slate-400">Show discount offer and updates on homepage.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input placeholder="Notification title" value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} className="rounded-lg bg-bg px-3 py-2" />
          <input placeholder="Notification message" value={noticeMessage} onChange={(e) => setNoticeMessage(e.target.value)} className="rounded-lg bg-bg px-3 py-2" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={saveNotice} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">Save Notification</button>
          {noticeSaved ? <span className="text-xs text-green-300">Saved!</span> : null}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-white/10 bg-card/70 p-6">
        <h2 className="font-display text-2xl">Offer Banner Control</h2>
        <p className="mt-1 text-sm text-slate-400">Admin can turn offer banner on/off anytime.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input placeholder="Offer title" value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} className="rounded-lg bg-bg px-3 py-2" />
          <input placeholder="Offer text" value={offerText} onChange={(e) => setOfferText(e.target.value)} className="rounded-lg bg-bg px-3 py-2" />
          <input placeholder="Offer image URL (or /promo.jpg)" value={offerImage} onChange={(e) => setOfferImage(e.target.value)} className="rounded-lg bg-bg px-3 py-2 md:col-span-2" />
          <input placeholder="Offer link (optional)" value={offerLink} onChange={(e) => setOfferLink(e.target.value)} className="rounded-lg bg-bg px-3 py-2 md:col-span-2" />
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={offerEnabled} onChange={(e) => setOfferEnabled(e.target.checked)} />
            Enable offer banner on homepage
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={saveOffer} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">Save Offer Banner</button>
          {offerSaved ? <span className="text-xs text-green-300">Saved!</span> : null}
        </div>
      </section>
        </>
      ) : null}

      {activeTab === "Live Chat" ? (
        <section className="mt-10 rounded-2xl border border-white/10 bg-card/70 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Live Chat Inbox</h2>
            <button onClick={clearChatLog} className="rounded-lg border border-rose-300/40 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/20">
              Clear Chat Log
            </button>
          </div>
          <div className="mb-4 grid gap-2 rounded-xl border border-white/10 bg-[#0b1634]/70 p-3">
            <p className="text-xs text-slate-400">Send a reply (stored as Admin message in chat log)</p>
            <div className="flex flex-wrap gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type admin reply..."
                className="flex-1 rounded-lg bg-bg px-3 py-2 text-sm text-white"
              />
              <button onClick={sendAdminReply} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400">
                Send Reply
              </button>
            </div>
          </div>
          {chatLog.length === 0 ? (
            <p className="text-sm text-slate-300">No chat messages yet.</p>
          ) : (
            <div className="space-y-3">
              {chatLog.map((msg, idx) => (
                <div key={`${msg.role}-${idx}`} className="rounded-xl border border-white/10 bg-[#0b1634]/70 p-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{msg.role === "user" ? "Student" : "Assistant"}</span>
                    <span>{formatStableDateTime(msg.time)}</span>
                  </div>
                  <p className="mt-1 text-slate-100">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </Wrapper>
  );
}
