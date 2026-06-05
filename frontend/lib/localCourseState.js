import { buildCourseRouteId } from "@/lib/courseIdentity";

export const LOCAL_COURSE_KEY = "badamclasses_instructor_courses";
export const LOCAL_DELETED_COURSE_KEY = "badamclasses_deleted_courses";
export const DEFAULT_LIVE_CLASS_URL = "https://www.youtube.com/channel/UC9KopMZXd5is7KvOzhamTYw/live";
export const LIVE_STREAM_TYPES = ["youtube", "hls", "mp4"];

const normalizeStorageId = (value) => String(value || "").trim().toLowerCase();
const DEMO_HOSTS = new Set(["example.com", "www.example.com", "example.org", "www.example.org", "example.net", "www.example.net"]);

export const getCourseStorageKey = (course = {}) =>
  normalizeStorageId(course._id || course.id || course.routeId || course.slug || buildCourseRouteId(course));

export function sanitizeStoredUrl(value, { allowRelative = false, allowDataImage = false } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (allowDataImage && /^data:image\//i.test(raw)) return raw;
  if (allowRelative && raw.startsWith("/")) return raw;
  if (!/^https?:\/\//i.test(raw)) return "";

  try {
    const parsed = new URL(raw);
    return DEMO_HOSTS.has(parsed.hostname.toLowerCase()) ? "" : raw;
  } catch {
    return "";
  }
}

const normalizeClassItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .filter((item) => item && (item.title || item.subtitle || item.href || item.viewUrl || item.pdfUrl))
    .map((item, index) => {
      const href = sanitizeStoredUrl(item.href || item.viewUrl);
      const pdfUrl = sanitizeStoredUrl(item.pdfUrl || item.pdf || item.notesUrl);
      return {
        id: item.id || `${String(item.title || "class").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "class"}-${index}`,
        title: item.title || `Class ${index + 1}`,
        subtitle: item.subtitle || item.dateTime || "",
        dateTime: item.dateTime || item.subtitle || "",
        href,
        viewUrl: href,
        pdfUrl,
        actionLabel: item.actionLabel || (href ? "Open Class" : "Coming Soon"),
        icon: item.icon || ""
      };
    });

export const normalizeClassSectionsForStorage = (sections = []) =>
  (Array.isArray(sections) ? sections : [])
    .filter((section) => section && section.title)
    .map((section, index) => ({
      id: section.id || `${String(section.title || "section").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "section"}-${index}`,
      title: section.title,
      items: normalizeClassItems(section.items || [])
    }))
    .filter((section) => section.items.length);

export function parseLineItems(value = "", fields = ["title", "url"]) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return fields.reduce((record, field, index) => ({ ...record, [field]: parts[index] || "" }), {});
    });
}

export function parseClassSectionsText(value = "") {
  const sectionMap = new Map();

  parseLineItems(value, ["sectionTitle", "title", "subtitle", "href", "actionLabel", "icon"]).forEach((item) => {
    if (!item.sectionTitle || !item.title) return;
    if (!sectionMap.has(item.sectionTitle)) {
      sectionMap.set(item.sectionTitle, { title: item.sectionTitle, items: [] });
    }
    sectionMap.get(item.sectionTitle).items.push({
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
      actionLabel: item.actionLabel,
      icon: item.icon
    });
  });

  return normalizeClassSectionsForStorage(Array.from(sectionMap.values()));
}

export function stringifyClassSections(sections = []) {
  return normalizeClassSectionsForStorage(sections)
    .flatMap((section) =>
      section.items.map((item) =>
        [section.title, item.title, item.subtitle || item.dateTime || "", item.href || item.viewUrl || "", item.actionLabel || "", item.icon || ""].join(" | ")
      )
    )
    .join("\n");
}

export function normalizeLocalCourseRecord(course = {}) {
  const id = String(course._id || course.id || `local-course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).trim();
  const price = Number(course.price || course.priceValue || 0);
  const offerPrice = Number(course.offerPrice || 0);
  const thumbnail = sanitizeStoredUrl(course.thumbnail || course.image || course.imageUrl, { allowRelative: true, allowDataImage: true });
  const liveClassEnabled = Object.prototype.hasOwnProperty.call(course, "liveClassEnabled")
    ? Boolean(course.liveClassEnabled)
    : Boolean(course.liveClassUrl);
  const liveStreamType = LIVE_STREAM_TYPES.includes(String(course.liveStreamType || "").toLowerCase())
    ? String(course.liveStreamType).toLowerCase()
    : "youtube";
  const videoSources = (Array.isArray(course.videoSources) ? course.videoSources : [])
    .map((item) => ({
      quality: item.quality || item.label || "Auto",
      label: item.label || item.quality || "Auto",
      url: sanitizeStoredUrl(item.url || item.videoUrl || item.src)
    }))
    .filter((item) => item.url);
  const pdfResources = (Array.isArray(course.pdfResources) ? course.pdfResources : [])
    .map((pdf, index) => ({
      id: pdf.id || `pdf-${index}`,
      title: pdf.title || `PDF ${index + 1}`,
      url: sanitizeStoredUrl(pdf.url || pdf.pdfUrl)
    }))
    .filter((pdf) => pdf.url);

  return {
    ...course,
    _id: id,
    id: course.id || id,
    slug: course.slug || course.routeId || "",
    routeSlug: course.routeSlug || course.slug || course.routeId || "",
    title: String(course.title || "Untitled Course").trim(),
    subtitle: String(course.subtitle || "").trim(),
    description: String(course.description || "").trim(),
    subject: String(course.subject || course.category || "General").trim(),
    category: String(course.category || course.subject || "General").trim(),
    instructor: course.instructor?.name || course.instructor || "BadamClasses",
    status: course.status === "draft" || course.status === "hidden" ? course.status : "active",
    isActive: course.isActive !== undefined ? Boolean(course.isActive) : course.status !== "hidden",
    featured: course.featured !== undefined ? Boolean(course.featured) : true,
    type: String(course.type || "standard").trim(),
    price,
    priceValue: price,
    offerPrice: offerPrice > 0 ? offerPrice : "",
    thumbnail,
    imageUrl: thumbnail || sanitizeStoredUrl(course.imageUrl, { allowRelative: true, allowDataImage: true }),
    image: thumbnail || course.image || "",
    liveClassEnabled,
    liveClassUrl: sanitizeStoredUrl(course.liveClassUrl) || DEFAULT_LIVE_CLASS_URL,
    liveClassTitle: String(course.liveClassTitle || "").trim(),
    liveStreamType,
    recordedVideoUrl: sanitizeStoredUrl(course.recordedVideoUrl),
    recordedClassTitle: String(course.recordedClassTitle || course.liveClassTitle || "").trim(),
    liveEndedAt: course.liveEndedAt || "",
    videoSources,
    pdfResources,
    classSections: normalizeClassSectionsForStorage(course.classSections || []),
    batchTime: String(course.batchTime || "").trim(),
    startDate: String(course.startDate || "").trim(),
    duration: String(course.duration || "Flexible").trim()
  };
}

export function readLocalCourses() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_COURSE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeLocalCourseRecord) : [];
  } catch {
    return [];
  }
}

export function writeLocalCourses(items = []) {
  if (typeof window === "undefined") return [];
  const normalized = Array.isArray(items) ? items.map(normalizeLocalCourseRecord) : [];
  if (!normalized.length) {
    window.localStorage.removeItem(LOCAL_COURSE_KEY);
    return [];
  }
  window.localStorage.setItem(LOCAL_COURSE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function readDeletedCourseKeys() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_DELETED_COURSE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((item) => normalizeStorageId(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function writeDeletedCourseKeys(items = []) {
  if (typeof window === "undefined") return [];
  const normalized = Array.from(new Set((items || []).map((item) => normalizeStorageId(item)).filter(Boolean)));
  if (!normalized.length) {
    window.localStorage.removeItem(LOCAL_DELETED_COURSE_KEY);
    return [];
  }
  window.localStorage.setItem(LOCAL_DELETED_COURSE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function isCourseDeleted(course, deletedKeys = readDeletedCourseKeys()) {
  const key = getCourseStorageKey(course);
  return Boolean(key && deletedKeys.includes(key));
}

export function filterDeletedCourses(items = [], deletedKeys = []) {
  return items.filter((item) => !isCourseDeleted(item, deletedKeys));
}

export function filterDeletedCoursesFromStorage(items = []) {
  return filterDeletedCourses(items, readDeletedCourseKeys());
}

export function hideLocalCourse(course = {}) {
  const key = getCourseStorageKey(course);
  if (!key) return readDeletedCourseKeys();
  return writeDeletedCourseKeys([...readDeletedCourseKeys(), key]);
}

export function showLocalCourse(course = {}) {
  const key = getCourseStorageKey(course);
  if (!key) return readDeletedCourseKeys();
  return writeDeletedCourseKeys(readDeletedCourseKeys().filter((item) => item !== key));
}

export function upsertLocalCourse(course = {}) {
  const nextCourse = normalizeLocalCourseRecord(course);
  const courses = readLocalCourses();
  const nextKey = getCourseStorageKey(nextCourse);
  const index = courses.findIndex((item) => {
    const itemKey = getCourseStorageKey(item);
    return itemKey === nextKey || String(item.title || "").trim().toLowerCase() === String(nextCourse.title || "").trim().toLowerCase();
  });
  const nextCourses = index >= 0
    ? courses.map((item, itemIndex) => (itemIndex === index ? { ...item, ...nextCourse } : item))
    : [nextCourse, ...courses];

  writeLocalCourses(nextCourses);
  if (nextCourse.status === "hidden") {
    hideLocalCourse(nextCourse);
  } else {
    showLocalCourse(nextCourse);
  }
  return nextCourse;
}

export function deleteLocalCourse(course = {}) {
  const key = getCourseStorageKey(course);
  const nextCourses = readLocalCourses().filter((item) => getCourseStorageKey(item) !== key);
  writeLocalCourses(nextCourses);
  hideLocalCourse(course);
  return nextCourses;
}
