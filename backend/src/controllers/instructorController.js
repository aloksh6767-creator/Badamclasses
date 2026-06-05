import Course from "../models/Course.js";
import CourseLiveOverride from "../models/CourseLiveOverride.js";
import Enrollment from "../models/Enrollment.js";
import { isDatabaseConnected } from "../config/db.js";
import {
  addLocalCoursePdf,
  addLocalCourseVideo,
  createLocalCourse,
  deleteLocalCourse,
  findLocalCourseById,
  listLocalCourses,
  listLocalEnrollments,
  listLocalUsers,
  updateLocalCourse
} from "../utils/localPersistence.js";

const DEFAULT_LIVE_CLASS_URL = "https://www.youtube.com/channel/UC9KopMZXd5is7KvOzhamTYw/live";
const normalizeCourseKey = (value = "") => String(value || "").trim().toLowerCase();
const normalizeLiveStreamType = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  return ["youtube", "hls", "mp4"].includes(normalized) ? normalized : "youtube";
};

const buildLivePatch = (body = {}) => ({
  liveClassEnabled: Boolean(body.liveClassEnabled),
  liveClassUrl: String(body.liveClassUrl || DEFAULT_LIVE_CLASS_URL).trim(),
  liveClassTitle: String(body.liveClassTitle || "").trim(),
  liveStreamType: normalizeLiveStreamType(body.liveStreamType),
  ...(body.recordedVideoUrl !== undefined ? { recordedVideoUrl: String(body.recordedVideoUrl || "").trim() } : {}),
  ...(body.recordedClassTitle !== undefined ? { recordedClassTitle: String(body.recordedClassTitle || "").trim() } : {}),
  ...(body.liveEndedAt !== undefined ? { liveEndedAt: body.liveEndedAt || null } : {})
});

export const createCourse = async (req, res) => {
  const payload = {
    ...req.body,
    instructor: req.user._id
  };

  if (!isDatabaseConnected()) {
    const course = createLocalCourse(payload);
    return res.status(201).json(course);
  }

  const course = await Course.create(payload);
  res.status(201).json(course);
};

export const updateCourse = async (req, res) => {
  if (!isDatabaseConnected()) {
    const course = findLocalCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (String(course.instructor) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const updated = updateLocalCourse(req.params.id, req.body);
    return res.json(updated);
  }

  const course = await Course.findById(req.params.id);
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  if (String(course.instructor) !== String(req.user._id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed" });
  }

  Object.assign(course, req.body);
  await course.save();

  res.json(course);
};

export const updateCourseLive = async (req, res) => {
  const livePatch = buildLivePatch(req.body);

  if (!isDatabaseConnected()) {
    const course = findLocalCourseById(req.params.courseKey);
    if (course) {
      const updated = updateLocalCourse(req.params.courseKey, livePatch);
      return res.json(updated);
    }
    return res.json({ courseKey: normalizeCourseKey(req.params.courseKey), ...livePatch });
  }

  if (/^[a-f\d]{24}$/i.test(req.params.courseKey)) {
    const course = await Course.findById(req.params.courseKey);
    if (course) {
      if (String(course.instructor) !== String(req.user._id) && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not allowed" });
      }
      Object.assign(course, livePatch);
      await course.save();
      return res.json(course);
    }
  }

  const courseKey = normalizeCourseKey(req.params.courseKey);
  if (!courseKey) {
    return res.status(400).json({ message: "Course key is required" });
  }

  const override = await CourseLiveOverride.findOneAndUpdate(
    { courseKey },
    {
      ...livePatch,
      updatedBy: req.user._id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json(override);
};

export const deleteCourse = async (req, res) => {
  if (!isDatabaseConnected()) {
    const course = findLocalCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (String(course.instructor) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    deleteLocalCourse(req.params.id);
    return res.json({ message: "Course deleted" });
  }

  const course = await Course.findById(req.params.id);
  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  if (String(course.instructor) !== String(req.user._id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed" });
  }

  await course.deleteOne();
  res.json({ message: "Course deleted" });
};

export const addVideo = async (req, res) => {
  const { title, videoUrl, duration } = req.body;

  if (!isDatabaseConnected()) {
    const course = addLocalCourseVideo(req.params.id, { title, videoUrl, duration });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    return res.json(course);
  }

  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  course.videos.push({ title, videoUrl, duration });
  await course.save();

  res.json(course);
};

export const addPdf = async (req, res) => {
  const { title, pdfUrl, url } = req.body;

  if (!isDatabaseConnected()) {
    const course = addLocalCoursePdf(req.params.id, { title, url: url || pdfUrl || "" });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    return res.json(course);
  }

  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  course.pdfResources.push({ title, pdfUrl: pdfUrl || url || "" });
  await course.save();

  res.json(course);
};

export const getInstructorCourses = async (req, res) => {
  if (!isDatabaseConnected()) {
    const courses = listLocalCourses(req.user._id, req.user.role === "admin");
    return res.json(courses);
  }

  const filter = req.user.role === "admin" ? {} : { instructor: req.user._id };
  const courses = await Course.find(filter).sort({ createdAt: -1 });
  res.json(courses);
};

export const getInstructorStudents = async (req, res) => {
  if (!isDatabaseConnected()) {
    const localUsers = listLocalUsers();
    const localCourses = listLocalCourses("", req.user.role === "admin");
    const visibleCourses = req.user.role === "admin"
      ? localCourses
      : localCourses.filter((course) => String(course.instructor) === String(req.user._id));
    const courseMap = new Map(visibleCourses.map((course) => [String(course._id), course]));

    const students = listLocalEnrollments()
      .filter((item) => courseMap.has(String(item.courseRouteId)) || courseMap.has(String(item.course)))
      .map((item) => {
        const student = localUsers.find((user) => String(user._id) === String(item.student));
        const course = courseMap.get(String(item.courseRouteId)) || courseMap.get(String(item.course)) || null;

        return {
          _id: item._id,
          student: student
            ? {
                _id: student._id,
                name: student.name,
                email: student.email,
                phone: student.phone || ""
              }
            : null,
          course: course
            ? {
                _id: course._id,
                title: course.title,
                instructor: course.instructor
              }
            : {
                _id: item.courseRouteId,
                title: item.courseTitle || item.courseSnapshot?.title || "Course",
                instructor: req.user._id
              },
          amount: item.amount || 0,
          paymentId: item.paymentId || "",
          orderId: item.orderId || "",
          paymentProvider: item.paymentProvider || "manual",
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        };
      });

    return res.json(students);
  }

  const students = await Enrollment.find()
    .populate("student", "name email")
    .populate("course", "title instructor")
    .then((rows) => rows.filter((item) => String(item.course?.instructor) === String(req.user._id)));

  res.json(students);
};
