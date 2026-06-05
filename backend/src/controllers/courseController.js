import mongoose from "mongoose";
import Course from "../models/Course.js";
import CourseLiveOverride from "../models/CourseLiveOverride.js";
import Review from "../models/Review.js";
import Wishlist from "../models/Wishlist.js";
import fallbackCourses from "../data/fallbackCourses.js";
import { isDatabaseConnected } from "../config/db.js";

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || "").trim());
const normalizeText = (value) => String(value || "").trim().toLowerCase();
const DEFAULT_LIVE_CLASS_URL = "https://www.youtube.com/channel/UC9KopMZXd5is7KvOzhamTYw/live";

const toPlainCourse = (course = {}) => (typeof course.toObject === "function" ? course.toObject() : { ...course });
const truthyQuery = (value) => ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());

const getCourseOverrideKeys = (course = {}) =>
  [
    course._id,
    course.id,
    course.slug,
    course.routeId,
    course.routeSlug,
    course.title
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean);

const findFallbackCourse = (id = "") => {
  const normalized = normalizeText(id);
  return fallbackCourses.find((course) => getCourseOverrideKeys(course).includes(normalized)) || null;
};

const getLiveOverrideMap = async (courses = []) => {
  if (!isDatabaseConnected()) return new Map();
  const keys = Array.from(new Set(courses.flatMap(getCourseOverrideKeys)));
  if (!keys.length) return new Map();

  const overrides = await CourseLiveOverride.find({ courseKey: { $in: keys } });
  const map = new Map();
  overrides.forEach((override) => {
    map.set(normalizeText(override.courseKey), override);
  });
  return map;
};

const applyLiveOverrides = async (courses = []) => {
  const plainCourses = courses.map(toPlainCourse);
  const overrideMap = await getLiveOverrideMap(plainCourses);

  return plainCourses.map((course) => {
    const override = getCourseOverrideKeys(course).map((key) => overrideMap.get(key)).find(Boolean);
    if (!override) return course;

    return {
      ...course,
      liveClassEnabled: Boolean(override.liveClassEnabled),
      liveClassUrl: override.liveClassUrl || DEFAULT_LIVE_CLASS_URL,
      liveClassTitle: override.liveClassTitle || course.liveClassTitle || "",
      liveStreamType: override.liveStreamType || course.liveStreamType || "youtube",
      recordedVideoUrl: override.recordedVideoUrl || course.recordedVideoUrl || "",
      recordedClassTitle: override.recordedClassTitle || course.recordedClassTitle || override.liveClassTitle || course.liveClassTitle || "",
      liveEndedAt: override.liveEndedAt || course.liveEndedAt || null
    };
  });
};

const filterFallbackCourses = ({ search, category, sort = "latest" }) => {
  let items = [...fallbackCourses];

  if (search) {
    const query = normalizeText(search);
    items = items.filter((course) => {
      return [course._id, course.id, course.title, course.description, course.category, course.instructor?.name].some((value) =>
        normalizeText(value).includes(query)
      );
    });
  }

  if (category) {
    const expected = normalizeText(category);
    items = items.filter((course) => normalizeText(course.category) === expected);
  }

  if (sort === "price-low") {
    items.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  } else if (sort === "price-high") {
    items.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  } else if (sort === "rating") {
    items.sort((a, b) => Number(b.ratingAverage || 0) - Number(a.ratingAverage || 0));
  } else {
    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  return items;
};

const filterVisibleCourses = (items = [], { featuredOnly = false } = {}) =>
  items.filter((course) => {
    if (course.isActive === false || course.status === "hidden" || course.status === "draft") return false;
    if (featuredOnly && course.featured === false) return false;
    return true;
  });

const mergeCoursesByKey = (items = []) => {
  const getMergeKey = (course = {}) => {
    const title = normalizeText(course.title);
    const category = normalizeText(course.category);
    if (title) return `title:${title}:${category}`;
    return `id:${normalizeText(course._id || course.id || course.slug)}`;
  };

  const isPlaceholder = (course = {}) => {
    const description = normalizeText(course.description);
    return (
      Number(course.price || 0) <= 0 ||
      !normalizeText(course.thumbnail || course.image || course.imageUrl) ||
      !description ||
      description === "course details will be updated soon."
    );
  };

  const fillGaps = (base = {}, next = {}) => {
    const basePrice = Number(base.price || 0);
    const nextPrice = Number(next.price || 0);
    const baseDescription = normalizeText(base.description);

    return {
      ...base,
      description:
        !base.description || baseDescription === "course details will be updated soon."
          ? next.description || base.description
          : base.description,
      price: basePrice > 0 ? base.price : nextPrice > 0 ? next.price : base.price,
      thumbnail: base.thumbnail || next.thumbnail || next.image || "",
      image: base.image || next.image || next.thumbnail || "",
      duration: base.duration || next.duration || "",
      batchTime: base.batchTime || next.batchTime || "",
      startDate: base.startDate || next.startDate || "",
      type: base.type || next.type || "standard",
      slug: base.slug || base.routeSlug || next.slug || next.routeSlug || "",
      routeSlug: base.routeSlug || base.slug || next.routeSlug || next.slug || "",
      isActive: base.isActive !== undefined ? base.isActive : next.isActive,
      featured: base.featured !== undefined ? base.featured : next.featured,
      imageUrl: base.imageUrl || next.imageUrl || "",
      offerPrice: base.offerPrice ?? next.offerPrice,
      discountPercent: base.discountPercent ?? next.discountPercent,
      offerLabel: base.offerLabel || next.offerLabel || "",
      liveClassEnabled: Boolean(base.liveClassEnabled || next.liveClassEnabled),
      liveClassUrl: base.liveClassUrl || next.liveClassUrl || "",
      liveClassTitle: base.liveClassTitle || next.liveClassTitle || "",
      liveStreamType: base.liveStreamType || next.liveStreamType || "youtube",
      recordedVideoUrl: base.recordedVideoUrl || next.recordedVideoUrl || "",
      recordedClassTitle: base.recordedClassTitle || next.recordedClassTitle || "",
      liveEndedAt: base.liveEndedAt || next.liveEndedAt || null,
      ratingAverage: Number(base.ratingAverage || 0) > 0 ? base.ratingAverage : next.ratingAverage,
      ratingCount: Number(base.ratingCount || 0) > 0 ? base.ratingCount : next.ratingCount,
      curriculum: Array.isArray(base.curriculum) && base.curriculum.length ? base.curriculum : next.curriculum,
      videos: Array.isArray(base.videos) && base.videos.length ? base.videos : next.videos,
      pdfResources: Array.isArray(base.pdfResources) && base.pdfResources.length ? base.pdfResources : next.pdfResources
    };
  };

  const merged = new Map();
  items.forEach((item) => {
    const course = toPlainCourse(item);
    const key = getMergeKey(course);
    if (!key) return;

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, course);
      return;
    }

    const shouldReplacePlaceholder = isPlaceholder(existing) && !isPlaceholder(course);
    merged.set(key, shouldReplacePlaceholder ? fillGaps(course, existing) : fillGaps(existing, course));
  });
  return Array.from(merged.values());
};

export const getCourses = async (req, res) => {
  const { search, category, sort = "latest" } = req.query;
  const featuredOnly = truthyQuery(req.query.featured);
  const safeFallbackCourses = filterVisibleCourses(filterFallbackCourses({ search, category, sort }), { featuredOnly });

  if (!isDatabaseConnected()) {
    return res.json(safeFallbackCourses);
  }

  const filter = { isActive: { $ne: false } };
  if (featuredOnly) {
    filter.featured = { $ne: false };
  }

  if (search) {
    const safeSearch = String(search || "").trim();
    filter.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
      { category: { $regex: safeSearch, $options: "i" } }
    ];
  }
  if (category) {
    filter.category = category;
  }

  let sortQuery = { createdAt: -1 };
  if (sort === "price-low") sortQuery = { price: 1 };
  if (sort === "price-high") sortQuery = { price: -1 };
  if (sort === "rating") sortQuery = { ratingAverage: -1 };

  const courses = await Course.find(filter)
    .populate("instructor", "name")
    .sort(sortQuery);

  const normalizedDbCourses = Array.isArray(courses) ? courses : [];
  const mergedCourses = await applyLiveOverrides(filterVisibleCourses(mergeCoursesByKey([...normalizedDbCourses, ...safeFallbackCourses]), { featuredOnly }));

  res.json(mergedCourses);
};

export const getCourseById = async (req, res) => {
  if (!isDatabaseConnected()) {
    const fallbackCourse = findFallbackCourse(req.params.id);

    if (!fallbackCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    return res.json({ course: fallbackCourse, reviews: [] });
  }

  if (!isValidObjectId(req.params.id)) {
    const safeId = String(req.params.id || "").trim();
    const courseBySlug = await Course.findOne({
      $or: [
        { slug: safeId },
        { routeSlug: safeId },
        { title: { $regex: `^${safeId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }
      ],
      isActive: { $ne: false }
    }).populate("instructor", "name email");

    if (courseBySlug) {
      const reviews = await Review.find({ course: courseBySlug._id }).populate("student", "name");
      const [courseWithLiveOverride] = await applyLiveOverrides([courseBySlug]);
      return res.json({ course: courseWithLiveOverride, reviews });
    }

    const fallbackCourse = findFallbackCourse(req.params.id);
    if (!fallbackCourse) {
      return res.status(404).json({ message: "Course not found" });
    }
    const [course] = await applyLiveOverrides([fallbackCourse]);
    return res.json({ course, reviews: [] });
  }

  const course = await Course.findOne({ _id: req.params.id, isActive: { $ne: false } }).populate("instructor", "name email");
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  const reviews = await Review.find({ course: course._id }).populate("student", "name");

  const [courseWithLiveOverride] = await applyLiveOverrides([course]);

  res.json({ course: courseWithLiveOverride, reviews });
};

export const addReview = async (req, res) => {
  const { rating, comment } = req.body;
  const { id: courseId } = req.params;

  if (!isValidObjectId(courseId)) {
    return res.status(404).json({ message: "Course not found" });
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  await Review.findOneAndUpdate(
    { course: courseId, student: req.user._id },
    { rating, comment },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const reviewStats = await Review.aggregate([
    { $match: { course: new mongoose.Types.ObjectId(courseId) } },
    {
      $group: {
        _id: "$course",
        avg: { $avg: "$rating" },
        count: { $sum: 1 }
      }
    }
  ]);

  const stats = reviewStats[0] || { avg: 0, count: 0 };
  course.ratingAverage = Number(stats.avg.toFixed(1));
  course.ratingCount = stats.count;
  await course.save();

  res.json({ message: "Review submitted" });
};

export const addToWishlist = async (req, res) => {
  const { id: courseId } = req.params;

  if (!isValidObjectId(courseId)) {
    return res.status(404).json({ message: "Course not found" });
  }

  await Wishlist.findOneAndUpdate(
    { student: req.user._id, course: courseId },
    { student: req.user._id, course: courseId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ message: "Added to wishlist" });
};
