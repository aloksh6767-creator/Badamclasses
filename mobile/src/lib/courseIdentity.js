export const slugifyPart = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const normalizeCourseRouteValue = (value) => String(value || "").trim().toLowerCase();

const buildLegacyCourseRouteId = (course, index = 0) => {
  const rawId = String(course?._id || course?.id || course?.slug || "").trim();
  if (rawId) return rawId;

  const parts = [
    slugifyPart(course?.title),
    slugifyPart(course?.category),
    slugifyPart(course?.instructor?.name || course?.instructor),
    slugifyPart(course?.startDate),
    slugifyPart(course?.batchTime)
  ].filter(Boolean);

  return parts.length ? `${parts.join("-")}-${index}` : `course-${index}`;
};

const buildCourseFingerprint = (course = {}) => {
  const base = [
    course?.title,
    course?.category,
    course?.instructor?.name || course?.instructor,
    course?.startDate,
    course?.batchTime,
    course?.price,
    course?.offerPrice
  ]
    .map((value) => slugifyPart(value))
    .filter(Boolean)
    .join("-");

  if (!base) return "course";

  let hash = 0;
  for (const char of base) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash.toString(36).slice(0, 6) || "course";
};

export const buildCourseSlug = (course = {}) =>
  [
    slugifyPart(course?.title),
    slugifyPart(course?.category),
    slugifyPart(course?.instructor?.name || course?.instructor),
    slugifyPart(course?.startDate),
    slugifyPart(course?.batchTime)
  ]
    .filter(Boolean)
    .join("-");

export const buildCourseRouteId = (course, index = 0) => {
  const rawId = String(course?._id || course?.id || "").trim();
  if (rawId) return rawId;

  const explicitSlug = slugifyPart(course?.slug);
  if (explicitSlug) return explicitSlug;

  const slug = buildCourseSlug(course);
  if (slug) return `${slug}-${buildCourseFingerprint(course)}`;

  return buildLegacyCourseRouteId(course, index);
};

export const normalizeCourseForRoute = (course, index = 0) => {
  const routeId = buildCourseRouteId(course, index);
  const priceValue = Number(course?.offerPrice || course?.priceValue || course?.price || 0);
  return {
    ...course,
    _id: course?._id || course?.id || routeId,
    id: course?.id || course?._id || routeId,
    slug: course?.slug || routeId,
    routeId,
    priceValue,
    image: course?.image || course?.thumbnail || ""
  };
};

export const matchCourseByRoute = (items = [], routeValue = "") => {
  const normalizedRoute = normalizeCourseRouteValue(routeValue);
  if (!normalizedRoute) return null;

  return (
    items.find((course, index) => {
      const normalized = normalizeCourseForRoute(course, index);
      const legacyRouteId = buildLegacyCourseRouteId(course, index);
      const slug = buildCourseSlug(course);
      const title = normalizeCourseRouteValue(normalized.title);
      return (
        normalizeCourseRouteValue(normalized.routeId) === normalizedRoute ||
        normalizeCourseRouteValue(normalized._id) === normalizedRoute ||
        normalizeCourseRouteValue(normalized.id) === normalizedRoute ||
        normalizeCourseRouteValue(normalized.slug) === normalizedRoute ||
        normalizeCourseRouteValue(legacyRouteId) === normalizedRoute ||
        normalizeCourseRouteValue(slug) === normalizedRoute ||
        title === normalizedRoute
      );
    }) || null
  );
};
