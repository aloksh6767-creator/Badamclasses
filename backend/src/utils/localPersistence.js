import crypto from "crypto";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const storageDir = path.resolve(process.cwd(), "storage");
const storageFile = path.join(storageDir, "local-runtime.json");

const defaultState = {
  users: [],
  enrollments: [],
  courses: [],
  offlineTests: [],
  inquiries: [],
  onlineMcqSets: []
};

const ensureStorage = () => {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  if (!fs.existsSync(storageFile)) {
    fs.writeFileSync(storageFile, JSON.stringify(defaultState, null, 2), "utf8");
  }
};

const readState = () => {
  ensureStorage();
  try {
    const raw = fs.readFileSync(storageFile, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      enrollments: Array.isArray(parsed.enrollments) ? parsed.enrollments : [],
      courses: Array.isArray(parsed.courses) ? parsed.courses : [],
      offlineTests: Array.isArray(parsed.offlineTests) ? parsed.offlineTests : [],
      inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
      onlineMcqSets: Array.isArray(parsed.onlineMcqSets) ? parsed.onlineMcqSets : []
    };
  } catch {
    return { ...defaultState };
  }
};

const writeState = (nextState) => {
  ensureStorage();
  fs.writeFileSync(storageFile, JSON.stringify(nextState, null, 2), "utf8");
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();

export const createLocalId = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;

export const findLocalUserByEmail = (email = "") => {
  const state = readState();
  return state.users.find((user) => normalizeEmail(user.email) === normalizeEmail(email)) || null;
};

export const findLocalUserByPhone = (phone = "") => {
  const state = readState();
  return state.users.find((user) => String(user.phone || "").trim() === String(phone || "").trim()) || null;
};

export const findLocalUserById = (id = "") => {
  const state = readState();
  return state.users.find((user) => String(user._id) === String(id)) || null;
};

export const listLocalUsers = () => {
  const state = readState();
  return clone(state.users);
};

export const createLocalUser = (user) => {
  const state = readState();
  const record = {
    _id: user._id || createLocalId("user"),
    name: String(user.name || "").trim(),
    email: normalizeEmail(user.email),
    password: user.password,
    phone: user.phone || "",
    role: user.role || "student",
    avatar: user.avatar || "",
    phoneVerified: Boolean(user.phoneVerified),
    phoneVerifiedAt: user.phoneVerifiedAt || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.users.push(record);
  writeState(state);
  return clone(record);
};

export const updateLocalUser = (id, patch) => {
  const state = readState();
  const index = state.users.findIndex((user) => String(user._id) === String(id));
  if (index === -1) return null;
  state.users[index] = {
    ...state.users[index],
    ...patch,
    ...(patch.email !== undefined ? { email: normalizeEmail(patch.email) } : {}),
    ...(patch.name !== undefined ? { name: String(patch.name || "").trim() } : {}),
    updatedAt: new Date().toISOString()
  };
  writeState(state);
  return clone(state.users[index]);
};

export const ensureLocalAdminAccount = () => {
  const email = normalizeEmail(process.env.LOCAL_ADMIN_EMAIL);
  const password = String(process.env.LOCAL_ADMIN_PASSWORD || "").trim();

  if (!email || !password) {
    return null;
  }

  const state = readState();
  const existingIndex = state.users.findIndex((user) => normalizeEmail(user.email) === email);
  const nextRecord = {
    _id: existingIndex >= 0 ? state.users[existingIndex]._id : createLocalId("user"),
    name: String(process.env.LOCAL_ADMIN_NAME || "Local Admin").trim() || "Local Admin",
    email,
    password: bcrypt.hashSync(password, 10),
    phone: String(process.env.LOCAL_ADMIN_PHONE || "").trim(),
    role: "admin",
    avatar: existingIndex >= 0 ? state.users[existingIndex].avatar || "" : "",
    phoneVerified: true,
    phoneVerifiedAt: existingIndex >= 0 ? state.users[existingIndex].phoneVerifiedAt || new Date().toISOString() : new Date().toISOString(),
    createdAt: existingIndex >= 0 ? state.users[existingIndex].createdAt || new Date().toISOString() : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    state.users[existingIndex] = {
      ...state.users[existingIndex],
      ...nextRecord
    };
  } else {
    state.users.push(nextRecord);
  }

  writeState(state);
  return clone(nextRecord);
};

export const listLocalEnrollmentsByStudent = (studentId) => {
  const state = readState();
  return clone(state.enrollments.filter((item) => String(item.student) === String(studentId)));
};

export const listLocalEnrollments = () => {
  const state = readState();
  return clone(state.enrollments);
};

export const findLocalEnrollment = ({ studentId, enrollmentId, courseRouteId }) => {
  const state = readState();
  return (
    state.enrollments.find((item) => {
      if (studentId && String(item.student) !== String(studentId)) return false;
      if (enrollmentId && String(item._id) !== String(enrollmentId)) return false;
      if (courseRouteId && String(item.courseRouteId) !== String(courseRouteId)) return false;
      return true;
    }) || null
  );
};

export const upsertLocalEnrollment = (payload) => {
  const state = readState();
  const existingIndex = state.enrollments.findIndex(
    (item) => String(item.student) === String(payload.student) && String(item.courseRouteId) === String(payload.courseRouteId)
  );

  const baseRecord =
    existingIndex >= 0
      ? state.enrollments[existingIndex]
      : {
          _id: createLocalId("enrollment"),
          createdAt: new Date().toISOString(),
          progress: 0,
          completed: false,
          certificateUrl: ""
        };

  const nextRecord = {
    ...baseRecord,
    ...payload,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    state.enrollments[existingIndex] = nextRecord;
  } else {
    state.enrollments.push(nextRecord);
  }

  writeState(state);
  return clone(nextRecord);
};

export const updateLocalEnrollment = (enrollmentId, studentId, patch) => {
  const state = readState();
  const index = state.enrollments.findIndex(
    (item) => String(item._id) === String(enrollmentId) && String(item.student) === String(studentId)
  );
  if (index === -1) return null;
  state.enrollments[index] = {
    ...state.enrollments[index],
    ...patch,
    updatedAt: new Date().toISOString()
  };
  writeState(state);
  return clone(state.enrollments[index]);
};

export const listLocalCourses = (instructorId = "", includeAll = false) => {
  const state = readState();
  if (includeAll) {
    return clone(state.courses);
  }
  return clone(state.courses.filter((course) => String(course.instructor) === String(instructorId)));
};

export const findLocalCourseById = (id = "") => {
  const state = readState();
  return state.courses.find((course) => String(course._id) === String(id)) || null;
};

export const createLocalCourse = (payload) => {
  const state = readState();
  const record = {
    _id: payload._id || createLocalId("course"),
    title: payload.title || "Untitled Course",
    description: payload.description || "",
    price: Number(payload.price || 0),
    offerPrice: payload.offerPrice ?? null,
    discountPercent: payload.discountPercent ?? null,
    offerLabel: payload.offerLabel || null,
    startTime: payload.startTime || null,
    endTime: payload.endTime || null,
    batchTime: payload.batchTime || null,
    startDate: payload.startDate || null,
    liveClassEnabled: Boolean(payload.liveClassEnabled),
    recordedVideoUrl: payload.recordedVideoUrl || null,
    liveClassUrl: payload.liveClassUrl || null,
    liveClassTitle: payload.liveClassTitle || null,
    classTiming: payload.classTiming || null,
    category: payload.category || "",
    thumbnail: payload.thumbnail || "",
    curriculum: Array.isArray(payload.curriculum) ? payload.curriculum : [],
    classSections: Array.isArray(payload.classSections) ? payload.classSections : [],
    pdfResources: Array.isArray(payload.pdfResources) ? payload.pdfResources : [],
    videos: Array.isArray(payload.videos) ? payload.videos : [],
    instructor: payload.instructor,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.courses.unshift(record);
  writeState(state);
  return clone(record);
};

export const updateLocalCourse = (id, patch) => {
  const state = readState();
  const index = state.courses.findIndex((course) => String(course._id) === String(id));
  if (index === -1) return null;
  state.courses[index] = {
    ...state.courses[index],
    ...patch,
    price: patch.price !== undefined ? Number(patch.price || 0) : state.courses[index].price,
    updatedAt: new Date().toISOString()
  };
  writeState(state);
  return clone(state.courses[index]);
};

export const deleteLocalCourse = (id) => {
  const state = readState();
  const index = state.courses.findIndex((course) => String(course._id) === String(id));
  if (index === -1) return false;
  state.courses.splice(index, 1);
  writeState(state);
  return true;
};

export const addLocalCourseVideo = (id, video) => {
  const course = findLocalCourseById(id);
  if (!course) return null;
  const videos = [...(Array.isArray(course.videos) ? course.videos : []), video];
  return updateLocalCourse(id, { videos });
};

export const addLocalCoursePdf = (id, pdf) => {
  const course = findLocalCourseById(id);
  if (!course) return null;
  const pdfResources = [...(Array.isArray(course.pdfResources) ? course.pdfResources : []), pdf];
  return updateLocalCourse(id, { pdfResources });
};

export const listLocalOfflineTests = () => {
  const state = readState();
  return clone(state.offlineTests || []);
};

export const createLocalOfflineTest = (payload) => {
  const state = readState();
  const record = {
    _id: payload._id || createLocalId("offline_test"),
    rollNumber: payload.rollNumber || `OFF-${Date.now().toString().slice(-6)}`,
    studentName: payload.studentName || "",
    phone: payload.phone || "",
    email: payload.email || "",
    examName: payload.examName || "",
    batchName: payload.batchName || "",
    testDate: payload.testDate || "",
    center: payload.center || "",
    notes: payload.notes || "",
    status: payload.status || "registered",
    marksObtained: payload.marksObtained ?? null,
    totalMarks: payload.totalMarks ?? null,
    rank: payload.rank ?? "",
    resultNotes: payload.resultNotes || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.offlineTests = Array.isArray(state.offlineTests) ? state.offlineTests : [];
  state.offlineTests.unshift(record);
  writeState(state);
  return clone(record);
};

export const updateLocalOfflineTest = (id, patch) => {
  const state = readState();
  state.offlineTests = Array.isArray(state.offlineTests) ? state.offlineTests : [];
  const index = state.offlineTests.findIndex((item) => String(item._id) === String(id));
  if (index === -1) return null;
  state.offlineTests[index] = {
    ...state.offlineTests[index],
    ...patch,
    updatedAt: new Date().toISOString()
  };
  writeState(state);
  return clone(state.offlineTests[index]);
};

export const listLocalInquiries = () => {
  const state = readState();
  return clone(state.inquiries || []);
};

export const createLocalInquiry = (payload) => {
  const state = readState();
  const record = {
    _id: payload._id || createLocalId("inquiry"),
    name: payload.name || "",
    email: payload.email || "",
    message: payload.message || "",
    status: payload.status || "new",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.inquiries = Array.isArray(state.inquiries) ? state.inquiries : [];
  state.inquiries.unshift(record);
  writeState(state);
  return clone(record);
};

export const listLocalOnlineMcqSets = () => {
  const state = readState();
  return clone(state.onlineMcqSets || []);
};

export const createLocalOnlineMcqSet = (payload) => {
  const state = readState();
  const record = {
    _id: payload._id || createLocalId("online_mcq"),
    title: payload.title || "Telegram MCQ Set",
    examName: payload.examName || "Online MCQ",
    source: payload.source || "telegram",
    status: payload.status || "published",
    questions: Array.isArray(payload.questions) ? payload.questions : [],
    createdBy: payload.createdBy || "telegram-admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.onlineMcqSets = Array.isArray(state.onlineMcqSets) ? state.onlineMcqSets : [];
  state.onlineMcqSets.unshift(record);
  writeState(state);
  return clone(record);
};
