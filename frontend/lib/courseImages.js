const STUDENT_BATCH_IMAGE = "/students-carrying-bags.svg";
const DEFAULT_COURSE_BANNER = "/railway-batch-banner-2026.png";
const UDAAN_COMBO_BANNER = "/udaan-combo-batch-2026.png";
const ARITHMETIC_SPECIAL_BANNER = "/arithmetic-special-batch-2026.png";
const REASONING_FOUNDATION_BANNER = "/reasoning-foundation-batch-2026.png";

const EXACT_IMAGE_MAP = {
  "phoolbagh-branch-new-batch-2026": "/phoolbagh-new-batch-2026.png",
  "phoolbagh branch new batch 2.0": "/phoolbagh-new-batch-2026.png",
  "udan-batch": UDAAN_COMBO_BANNER,
  "udaan batch combo (maths + reasoning)": UDAAN_COMBO_BANNER,
  "arithmetic-special": ARITHMETIC_SPECIAL_BANNER,
  "arithmetic special (recorded)": ARITHMETIC_SPECIAL_BANNER,
  "recorded-batch": "/recorded-batch.jpg",
  "recorded batch": "/recorded-batch.jpg",
  "mp-police": DEFAULT_COURSE_BANNER,
  "mp police batch": DEFAULT_COURSE_BANNER,
  "maths-special": "/ssc-complete.jpg",
  "maths special batch": "/ssc-complete.jpg",
  "reasoning-batch": REASONING_FOUNDATION_BANNER,
  "reasoning batch": REASONING_FOUNDATION_BANNER,
  "reasoning foundation batch 2026": REASONING_FOUNDATION_BANNER,
  "ssc-complete": "/ssc-complete.jpg",
  "ssc complete batch": "/ssc-complete.jpg",
  "railway-foundation": DEFAULT_COURSE_BANNER,
  "railway foundation batch": DEFAULT_COURSE_BANNER
};

const KEYWORD_IMAGE_MAP = [
  { keywords: ["phoolbagh"], image: "/phoolbagh-new-batch-2026.png" },
  { keywords: ["recorded"], image: "/recorded-batch.jpg" },
  { keywords: ["arithmetic"], image: ARITHMETIC_SPECIAL_BANNER },
  { keywords: ["udan", "udaan"], image: UDAAN_COMBO_BANNER },
  { keywords: ["reasoning"], image: REASONING_FOUNDATION_BANNER },
  { keywords: ["math", "ssc"], image: "/ssc-complete.jpg" },
  { keywords: ["railway", "police", "state", "banking"], image: DEFAULT_COURSE_BANNER }
];

const PLACEHOLDER_IMAGES = new Set([
  STUDENT_BATCH_IMAGE,
  "students-carrying-bags.svg",
  "/students-carrying-bags.svg"
]);

const isPlaceholderImage = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return true;
  const withoutOrigin = normalized.replace(/^https?:\/\/[^/]+/i, "");
  return PLACEHOLDER_IMAGES.has(normalized) || PLACEHOLDER_IMAGES.has(withoutOrigin);
};

export const getCourseFallbackImage = (course) => {
  const idKey = String(course?.id || course?._id || "").trim().toLowerCase();
  const titleKey = String(course?.title || "").trim().toLowerCase();

  if (EXACT_IMAGE_MAP[idKey]) return EXACT_IMAGE_MAP[idKey];
  if (EXACT_IMAGE_MAP[titleKey]) return EXACT_IMAGE_MAP[titleKey];

  const text = `${idKey} ${titleKey} ${course?.category || ""}`.toLowerCase();
  const match = KEYWORD_IMAGE_MAP.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)));
  return match?.image || DEFAULT_COURSE_BANNER;
};

export const resolveCourseImage = (course) => {
  const candidate = course?.image || course?.thumbnail || course?.imageUrl || "";
  if (!isPlaceholderImage(candidate)) return candidate;
  return getCourseFallbackImage(course);
};
