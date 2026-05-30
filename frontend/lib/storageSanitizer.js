const LOCAL_COURSE_KEY = "badamclasses_instructor_courses";
const LOCAL_PDF_KEY = "badamclasses_local_pdfs";
const OFFER_KEY = "badamclasses_offer_banner";

const DEMO_HOSTS = new Set([
  "example.com",
  "www.example.com",
  "example.org",
  "www.example.org",
  "example.net",
  "www.example.net"
]);

export function sanitizeStoredUrl(value, { allowRelative = false, allowDataImage = false } = {}) {
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

function readJsonStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  if (typeof window === "undefined") return;
  const isEmptyObject = value && typeof value === "object" && !Array.isArray(value) && !Object.keys(value).length;
  const isEmptyArray = Array.isArray(value) && !value.length;
  if (!value || isEmptyObject || isEmptyArray) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function sanitizeStoredClassSections(sections = []) {
  return (sections || []).map((section) => ({
    ...section,
    items: (section.items || []).map((item) => ({
      ...item,
      href: sanitizeStoredUrl(item.href || item.viewUrl),
      viewUrl: sanitizeStoredUrl(item.viewUrl || item.href),
      pdfUrl: sanitizeStoredUrl(item.pdfUrl || item.pdf || item.notesUrl)
    }))
  }));
}

function sanitizeStoredCourseRecord(course = {}) {
  return {
    ...course,
    thumbnail: sanitizeStoredUrl(course.thumbnail || course.image, { allowRelative: true, allowDataImage: true }),
    recordedVideoUrl: sanitizeStoredUrl(course.recordedVideoUrl),
    videoSources: (Array.isArray(course.videoSources) ? course.videoSources : [])
      .map((item) => ({ ...item, url: sanitizeStoredUrl(item.url) }))
      .filter((item) => item.url),
    liveClassUrl: sanitizeStoredUrl(course.liveClassUrl),
    classSections: sanitizeStoredClassSections(course.classSections || []),
    pdfResources: (Array.isArray(course.pdfResources) ? course.pdfResources : [])
      .map((pdf) => ({ ...pdf, url: sanitizeStoredUrl(pdf.url || pdf.pdfUrl) }))
      .filter((pdf) => pdf.url)
  };
}

function sanitizeStoredPdfMap(pdfMap = {}) {
  return Object.fromEntries(
    Object.entries(pdfMap || {})
      .map(([courseId, items]) => [
      courseId,
      (Array.isArray(items) ? items : [])
          .map((item) => ({ ...item, url: sanitizeStoredUrl(item.url || item.pdfUrl) }))
          .filter((item) => item.url)
      ])
      .filter(([, items]) => items.length)
  );
}

export function cleanupInvalidStoredUrls() {
  if (typeof window === "undefined") return;

  const localCourses = readJsonStorage(LOCAL_COURSE_KEY, []);
  const cleanedCourses = localCourses.map((course) => sanitizeStoredCourseRecord(course));
  if (JSON.stringify(cleanedCourses) !== JSON.stringify(localCourses)) {
    writeJsonStorage(LOCAL_COURSE_KEY, cleanedCourses);
  }

  const localPdfs = readJsonStorage(LOCAL_PDF_KEY, {});
  const cleanedPdfs = sanitizeStoredPdfMap(localPdfs);
  if (JSON.stringify(cleanedPdfs) !== JSON.stringify(localPdfs)) {
    writeJsonStorage(LOCAL_PDF_KEY, cleanedPdfs);
  }

  const banner = readJsonStorage(OFFER_KEY, null);
  if (banner) {
    const cleanedBanner = {
      ...banner,
      image: sanitizeStoredUrl(banner.image, { allowRelative: true }),
      link: sanitizeStoredUrl(banner.link)
    };
    if (JSON.stringify(cleanedBanner) !== JSON.stringify(banner)) {
      writeJsonStorage(OFFER_KEY, cleanedBanner);
    }
  }
}
