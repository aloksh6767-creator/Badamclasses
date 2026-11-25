const STUDENT_BATCH_IMAGE = "/students-carrying-bags.svg";
const DEFAULT_COURSE_BANNER = "/new-batch-starts-2026.webp";
const RAILWAY_BATCH_BANNER = "/railway-batch-banner-new.webp";
const MP_POLICE_BANNER = "/mp-police-batch-banner.webp";
const UDAAN_COMBO_BANNER = "/udaan-combo-batch-2026.webp";
const ARITHMETIC_SPECIAL_BANNER = "/arithmetic-special-batch-2026.webp";
const REASONING_FOUNDATION_BANNER = "/reasoning-foundation-batch-2026.webp";
const SSC_COMPLETE_BANNER = "/ssc-complete-batch-2026.webp";
const MATHS_SPECIAL_BANNER = "/maths-special-batch-upload.png";
const RECORDED_BATCH_2_BANNER = "/recorded-batch-2-0-upload.png";
const SSC_FOUNDATION_2027_BANNER = "/ssc-foundation-batch-2027.png";
const SSC_FOUNDATION_BANNER = "/ssc-foundation-batch.png";

const EXACT_IMAGE_MAP = {
  "phoolbagh-branch-new-batch-2026": "/phoolbagh-new-batch-2026.webp",
  "phoolbagh branch new batch 2.0": "/phoolbagh-new-batch-2026.webp",
  "udan-batch": UDAAN_COMBO_BANNER,
  "udaan batch combo (maths + reasoning)": UDAAN_COMBO_BANNER,
  "arithmetic-special": ARITHMETIC_SPECIAL_BANNER,
  "arithmetic special (recorded)": ARITHMETIC_SPECIAL_BANNER,
  "recorded-batch": RECORDED_BATCH_2_BANNER,
  "recorded batch": RECORDED_BATCH_2_BANNER,
  "recorded-batch-2-0": RECORDED_BATCH_2_BANNER,
  "recorded batch 2.0": RECORDED_BATCH_2_BANNER,
  "mp-police": MP_POLICE_BANNER,
  "mp police batch": MP_POLICE_BANNER,
  "maths-special": MATHS_SPECIAL_BANNER,
  "maths special batch": MATHS_SPECIAL_BANNER,
  "reasoning-batch": REASONING_FOUNDATION_BANNER,
  "reasoning batch": REASONING_FOUNDATION_BANNER,
  "reasoning foundation batch 2026": REASONING_FOUNDATION_BANNER,
  "ssc-complete": SSC_COMPLETE_BANNER,
  "ssc complete batch": SSC_COMPLETE_BANNER,
  "ssc-foundation-batch-2027": SSC_FOUNDATION_2027_BANNER,
  "ssc foundation batch 2027": SSC_FOUNDATION_2027_BANNER,
  "ssc-foundation-2027": SSC_FOUNDATION_2027_BANNER,
  "ssc-foundation-batch": SSC_FOUNDATION_BANNER,
  "ssc foundation batch": SSC_FOUNDATION_BANNER,
  "railway-foundation": RAILWAY_BATCH_BANNER,
  "railway foundation batch": RAILWAY_BATCH_BANNER
};

const KEYWORD_IMAGE_MAP = [
  { keywords: ["ssc foundation batch 2027"], image: SSC_FOUNDATION_2027_BANNER },
  { keywords: ["ssc foundation"], image: SSC_FOUNDATION_BANNER },
  { keywords: ["phoolbagh"], image: "/phoolbagh-new-batch-2026.webp" },
  { keywords: ["recorded"], image: "/recorded-batch.webp" },
  { keywords: ["arithmetic"], image: ARITHMETIC_SPECIAL_BANNER },
  { keywords: ["udan", "udaan"], image: UDAAN_COMBO_BANNER },
  { keywords: ["reasoning"], image: REASONING_FOUNDATION_BANNER },
  { keywords: ["math"], image: MATHS_SPECIAL_BANNER },
  { keywords: ["ssc"], image: SSC_COMPLETE_BANNER },
  { keywords: ["mp police", "police"], image: MP_POLICE_BANNER },
  { keywords: ["railway"], image: RAILWAY_BATCH_BANNER },
  { keywords: ["state", "banking"], image: DEFAULT_COURSE_BANNER }
];

const PLACEHOLDER_IMAGES = new Set([
  STUDENT_BATCH_IMAGE,
  "students-carrying-bags.svg",
  "/students-carrying-bags.svg"
]);

// Keep a newly uploaded admin banner intact, but replace known bundled defaults
// with the batch-specific assets selected for these course titles.
const LEGACY_GENERIC_BANNERS = new Set([
  "/recorded-batch.webp",
  "/recorded-batch-2-2026.webp",
  "/maths-special-batch-2026.webp",
  "/ssc-complete.webp",
  "/ssc-complete-batch-2026.webp",
  "/ssc-complete.jpg"
]);

const getAssetPath = (value = "") => {
  try {
    return new URL(String(value), "https://badamclasses.local").pathname;
  } catch {
    return String(value || "").trim();
  }
};

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
  const fallbackImage = getCourseFallbackImage(course);
  const candidatePath = getAssetPath(candidate);
  const hasTitleSpecificFallback = fallbackImage !== DEFAULT_COURSE_BANNER;

  if (
    hasTitleSpecificFallback &&
    (String(candidate || "").trim() === DEFAULT_COURSE_BANNER || LEGACY_GENERIC_BANNERS.has(candidatePath))
  ) {
    return fallbackImage;
  }
  if (!isPlaceholderImage(candidate)) return candidate;
  return fallbackImage;
};
