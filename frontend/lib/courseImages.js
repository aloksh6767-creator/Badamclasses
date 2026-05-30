const STUDENT_BATCH_IMAGE = "/students-carrying-bags.svg";

const EXACT_IMAGE_MAP = {
  "phoolbagh-branch-new-batch-2026": "/phoolbagh-new-batch-2026.png",
  "phoolbagh branch new batch 2.0": "/phoolbagh-new-batch-2026.png",
  "udan-batch": "/maths-batch.jpg",
  "udaan batch combo (maths + reasoning)": "/maths-batch.jpg",
  "arithmetic-special": "/recorded-batch.jpg",
  "arithmetic special (recorded)": "/recorded-batch.jpg",
  "recorded-batch": "/recorded-batch.jpg",
  "recorded batch": "/recorded-batch.jpg",
  "maths-special": "/maths-batch.jpg",
  "maths special batch": "/maths-batch.jpg",
  "ssc-complete": "/ssc-complete.jpg",
  "ssc complete batch": "/ssc-complete.jpg"
};

const KEYWORD_IMAGE_MAP = [
  { keywords: ["phoolbagh"], image: "/phoolbagh-new-batch-2026.png" },
  { keywords: ["recorded"], image: "/recorded-batch.jpg" },
  { keywords: ["math", "arithmetic", "advance", "udan"], image: "/maths-batch.jpg" },
  { keywords: ["ssc"], image: "/ssc-complete.jpg" }
];

export const getCourseFallbackImage = (course) => {
  const idKey = String(course?.id || course?._id || "").trim().toLowerCase();
  const titleKey = String(course?.title || "").trim().toLowerCase();

  if (EXACT_IMAGE_MAP[idKey]) return EXACT_IMAGE_MAP[idKey];
  if (EXACT_IMAGE_MAP[titleKey]) return EXACT_IMAGE_MAP[titleKey];

  const text = `${idKey} ${titleKey} ${course?.category || ""}`.toLowerCase();
  const match = KEYWORD_IMAGE_MAP.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)));
  return match?.image || STUDENT_BATCH_IMAGE;
};

export const resolveCourseImage = (course) => {
  const candidate = course?.image || course?.thumbnail || "";
  if (candidate && candidate !== STUDENT_BATCH_IMAGE) return candidate;
  return getCourseFallbackImage(course);
};
