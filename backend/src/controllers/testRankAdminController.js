import mongoose from "mongoose";
import AdminAuditLog from "../models/AdminAuditLog.js";
import Enrollment from "../models/Enrollment.js";
import OnlineMcqSet from "../models/OnlineMcqSet.js";
import TestAttempt from "../models/TestAttempt.js";
import User from "../models/User.js";
import { isDatabaseConnected } from "../config/db.js";
import {
  addLocalAdminAuditLog,
  createLocalOnlineMcqSet,
  findLocalUserById,
  listLocalAdminAuditLogs,
  listLocalEnrollments,
  listLocalOnlineMcqSets,
  listLocalTestAttempts,
  listLocalUsers,
  updateLocalOnlineMcqSet
} from "../utils/localPersistence.js";

const clean = (value, max = 240) => String(value ?? "").trim().slice(0, max);
const toId = (record) => String(record?._id || record?.id || "");
const answerIndex = (value) => {
  if (typeof value === "number") return Number.isInteger(value) && value >= 0 && value <= 3 ? value : -1;
  const raw = String(value ?? "").trim().toLowerCase();
  if (/^[a-d]$/.test(raw)) return raw.charCodeAt(0) - 97;
  if (/^[1-4]$/.test(raw)) return Number(raw) - 1;
  return -1;
};

const validateQuestionSet = (body = {}) => {
  const errors = [];
  const title = clean(body.title, 120);
  const examName = clean(body.examName, 100);
  const questions = Array.isArray(body.questions) ? body.questions : [];
  if (!title) errors.push("Test title is required.");
  if (!examName) errors.push("Exam name is required.");
  if (!questions.length) errors.push("Provide at least one question.");
  if (questions.length > 500) errors.push("A test can contain at most 500 questions.");

  const seenQuestions = new Set();
  const normalizedQuestions = questions.slice(0, 500).map((item, index) => {
    const question = clean(item?.question, 2000);
    const options = Array.isArray(item?.options) ? item.options.map((option) => clean(option, 1000)) : [];
    const answer = answerIndex(item?.answer);
    const normalizedText = question.toLocaleLowerCase().replace(/\s+/g, " ");
    if (!question) errors.push(`Question ${index + 1}: question text is required.`);
    if (options.length !== 4 || options.some((option) => !option)) errors.push(`Question ${index + 1}: provide exactly four non-empty options.`);
    if (new Set(options.map((option) => option.toLocaleLowerCase())).size !== options.length) errors.push(`Question ${index + 1}: options must be distinct.`);
    if (answer < 0 || answer > 3) errors.push(`Question ${index + 1}: use a numeric zero-based answer index (0-3) or answer letter (A-D).`);
    if (normalizedText && seenQuestions.has(normalizedText)) errors.push(`Question ${index + 1}: duplicate question text in this test.`);
    seenQuestions.add(normalizedText);
    return {
      question,
      options,
      answer,
      explanation: clean(item?.explanation, 4000),
      subject: clean(item?.subject || body.subject, 100),
      section: clean(item?.section, 100),
      topic: clean(item?.topic, 140),
      difficulty: clean(item?.difficulty, 30),
      language: clean(item?.language || body.language, 50)
    };
  });

  const durationMinutes = Number(body.durationMinutes ?? 30);
  const marksPerQuestion = Number(body.marksPerQuestion ?? 1);
  const negativeMarks = Number(body.negativeMarks ?? 0);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 240) errors.push("Duration must be between 1 and 240 minutes.");
  if (!Number.isFinite(marksPerQuestion) || marksPerQuestion < 0 || marksPerQuestion > 100) errors.push("Marks per question must be between 0 and 100.");
  if (!Number.isFinite(negativeMarks) || negativeMarks < 0 || negativeMarks > 100) errors.push("Negative marks must be between 0 and 100.");
  const status = body.status === "published" ? "published" : "draft";
  const publishAt = body.publishAt ? new Date(body.publishAt) : null;
  const closeAt = body.closeAt ? new Date(body.closeAt) : null;
  if (publishAt && Number.isNaN(publishAt.getTime())) errors.push("Scheduled publication time is invalid.");
  if (closeAt && Number.isNaN(closeAt.getTime())) errors.push("Test closing time is invalid.");
  if (publishAt && closeAt && closeAt <= publishAt) errors.push("Test closing time must be after scheduled publication.");

  return {
    errors,
    payload: {
      title,
      examName,
      examFamily: clean(body.examFamily, 80),
      testType: ["full", "sectional", "topic", "pyq"].includes(body.testType) ? body.testType : "",
      subject: clean(body.subject, 100),
      source: clean(body.source || "admin", 40),
      status,
      questions: normalizedQuestions,
      durationMinutes: Math.round(durationMinutes),
      marksPerQuestion,
      negativeMarks,
      allowReview: body.allowReview !== false,
      publishAt,
      closeAt,
      createdBy: ""
    }
  };
};

const summary = (item) => ({
  id: toId(item),
  title: item.title,
  examName: item.examName || "Online MCQ",
  examFamily: item.examFamily || "",
  testType: item.testType || "",
  subject: item.subject || "",
  status: item.status || "draft",
  questionCount: Array.isArray(item.questions) ? item.questions.length : Number(item.questionCount || 0),
  durationMinutes: Number(item.durationMinutes || 30),
  marksPerQuestion: Number(item.marksPerQuestion ?? 1),
  negativeMarks: Number(item.negativeMarks ?? 0),
  allowReview: item.allowReview !== false,
  publishAt: item.publishAt || null,
  closeAt: item.closeAt || null,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt
});

const allSets = async () => isDatabaseConnected()
  ? OnlineMcqSet.find({}).sort({ updatedAt: -1 }).lean()
  : listLocalOnlineMcqSets().sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

const appendAudit = async (req, action, entityType, entityId, description) => {
  const row = {
    actorId: String(req.user?._id || req.user?.id || "admin"),
    actorEmail: clean(req.user?.email, 180),
    action,
    entityType,
    entityId: String(entityId || ""),
    summary: clean(description, 500)
  };
  try {
    if (isDatabaseConnected()) await AdminAuditLog.create(row);
    else addLocalAdminAuditLog(row);
    return true;
  } catch (error) {
    console.error("[TestRank admin audit] Failed to persist event:", error.message);
    return false;
  }
};

export const listAdminTestSets = async (_req, res) => res.json({ tests: (await allSets()).map(summary) });

export const getAdminTestSet = async (req, res) => {
  const id = String(req.params.testId || "");
  const test = isDatabaseConnected()
    ? (mongoose.isValidObjectId(id) ? await OnlineMcqSet.findById(id).lean() : null)
    : listLocalOnlineMcqSets().find((item) => toId(item) === id);
  if (!test) return res.status(404).json({ message: "Test was not found." });
  return res.json({ test: { ...summary(test), questions: (test.questions || []).map((item) => ({ ...item, options: item.options || [] })) } });
};

export const createAdminTestSet = async (req, res) => {
  const { payload, errors } = validateQuestionSet(req.body);
  if (errors.length) return res.status(400).json({ message: "Test validation failed.", errors });
  payload.createdBy = String(req.user?._id || req.user?.email || "admin");
  const record = isDatabaseConnected() ? await OnlineMcqSet.create(payload) : createLocalOnlineMcqSet(payload);
  const auditLogged = await appendAudit(req, "test.created", "test", toId(record), `Created ${payload.status} test “${payload.title}” with ${payload.questions.length} structurally validated questions.`);
  return res.status(201).json({ test: summary(record), auditLogged });
};

export const updateAdminTestSet = async (req, res) => {
  const { payload, errors } = validateQuestionSet(req.body);
  if (errors.length) return res.status(400).json({ message: "Test validation failed.", errors });
  const id = String(req.params.testId || "");
  const current = isDatabaseConnected()
    ? (mongoose.isValidObjectId(id) ? await OnlineMcqSet.findById(id).lean() : null)
    : listLocalOnlineMcqSets().find((item) => toId(item) === id);
  if (!current) return res.status(404).json({ message: "Test was not found." });
  const hasAttempts = isDatabaseConnected()
    ? await TestAttempt.exists({ testId: id })
    : listLocalTestAttempts({ testId: id }).length > 0;
  if (hasAttempts) return res.status(409).json({ message: "A test with student attempts cannot be edited. Create a new version so existing results remain comparable." });
  payload.createdBy = current.createdBy || String(req.user?._id || req.user?.email || "admin");
  const updated = isDatabaseConnected()
    ? await OnlineMcqSet.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean()
    : updateLocalOnlineMcqSet(id, payload);
  if (!updated) return res.status(404).json({ message: "Test was not found." });
  const auditLogged = await appendAudit(req, "test.updated", "test", id, `Updated test “${payload.title}” (${payload.questions.length} questions).`);
  return res.json({ test: summary(updated), auditLogged });
};

export const setAdminTestStatus = async (req, res) => {
  const status = req.body?.status;
  if (!["draft", "published"].includes(status)) return res.status(400).json({ message: "Status must be draft or published." });
  const id = String(req.params.testId || "");
  const current = isDatabaseConnected()
    ? (mongoose.isValidObjectId(id) ? await OnlineMcqSet.findById(id).lean() : null)
    : listLocalOnlineMcqSets().find((item) => toId(item) === id);
  if (!current) return res.status(404).json({ message: "Test was not found." });
  if (status === "published") {
    const { errors } = validateQuestionSet({ ...current, status });
    if (errors.length) return res.status(400).json({ message: "Test cannot be published until validation passes.", errors });
  }
  const updated = isDatabaseConnected()
    ? await OnlineMcqSet.findByIdAndUpdate(id, { status }, { new: true, runValidators: true }).lean()
    : updateLocalOnlineMcqSet(id, { status });
  const auditLogged = await appendAudit(req, `test.${status}`, "test", id, `${status === "published" ? "Published" : "Moved to draft"} test “${current.title}”.`);
  return res.json({ test: summary(updated), auditLogged });
};

export const listAdminQuestionBank = async (req, res) => {
  const query = clean(req.query?.q, 120).toLocaleLowerCase();
  const testId = clean(req.query?.testId, 80);
  const sets = await allSets();
  const questions = sets.flatMap((test) => (test.questions || []).map((item, index) => ({
    id: `${toId(test)}:${index}`,
    testId: toId(test),
    testTitle: test.title,
    examName: test.examName || "Online MCQ",
    index,
    question: item.question,
    options: item.options || [],
    answer: item.answer,
    explanation: item.explanation || "",
    subject: item.subject || test.subject || "",
    section: item.section || "",
    topic: item.topic || "",
    difficulty: item.difficulty || "",
    language: item.language || ""
  })));
  const filtered = questions.filter((item) => (!testId || item.testId === testId) && (!query || `${item.question} ${item.subject} ${item.topic} ${item.examName}`.toLocaleLowerCase().includes(query)));
  return res.json({ questionCount: filtered.length, questions: filtered.slice(0, 500) });
};

export const getAdminTestAnalytics = async (_req, res) => {
  const [sets, users, enrollments, attempts] = await Promise.all([
    allSets(),
    isDatabaseConnected() ? User.countDocuments({ role: "student" }) : listLocalUsers().filter((item) => item.role === "student").length,
    isDatabaseConnected() ? Enrollment.find({}).select("amount currency createdAt courseTitle courseRouteId paymentId orderId paymentProvider student").populate("student", "name email").sort({ createdAt: -1 }).limit(500).lean() : listLocalEnrollments().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 500).map((item) => ({ ...item, student: findLocalUserById(item.student) })),
    isDatabaseConnected() ? TestAttempt.find({ status: "submitted", result: { $ne: null } }).select("testId result rankingEligible submittedAt").lean() : listLocalTestAttempts({ status: "submitted" }).filter((item) => item.result)
  ]);
  const byTest = new Map();
  for (const attempt of attempts) {
    const key = String(attempt.testId);
    const row = byTest.get(key) || { testId: key, attempts: 0, totalScore: 0, topScore: null };
    row.attempts += 1;
    row.totalScore += Number(attempt.result?.score || 0);
    row.topScore = row.topScore === null ? Number(attempt.result?.score || 0) : Math.max(row.topScore, Number(attempt.result?.score || 0));
    byTest.set(key, row);
  }
  const tests = sets.map((item) => {
    const stats = byTest.get(toId(item)) || { attempts: 0, totalScore: 0, topScore: null };
    return { ...summary(item), attempts: stats.attempts, averageScore: stats.attempts ? Number((stats.totalScore / stats.attempts).toFixed(2)) : null, topScore: stats.topScore };
  }).sort((a, b) => b.attempts - a.attempts);
  const confirmedAmountsByCurrency = enrollments.reduce((totals, item) => {
    const currency = clean(item.currency || "INR", 8).toUpperCase();
    totals[currency] = Number((Number(totals[currency] || 0) + Math.max(0, Number(item.amount || 0))).toFixed(2));
    return totals;
  }, {});
  return res.json({
    generatedAt: new Date().toISOString(),
    totals: {
      students,
      tests: sets.length,
      publishedTests: sets.filter((item) => item.status === "published").length,
      submittedAttempts: attempts.length,
      confirmedEnrollments: enrollments.length,
      confirmedEnrollmentAmountsByCurrency: confirmedAmountsByCurrency
    },
    tests
  });
};

export const listAdminStudents = async (req, res) => {
  const query = clean(req.query?.q, 100).toLocaleLowerCase();
  const students = isDatabaseConnected()
    ? await User.find({ role: "student" }).select("name email phone role createdAt").sort({ createdAt: -1 }).limit(500).lean()
    : listLocalUsers().filter((item) => item.role === "student").sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 500);
  const filtered = students.filter((item) => !query || `${item.name} ${item.email} ${item.phone}`.toLocaleLowerCase().includes(query));
  return res.json({ studentCount: filtered.length, students: filtered.map(({ _id, id, name, email, phone, role, createdAt }) => ({ id: String(_id || id), name, email, phone: phone || "", role, createdAt })) });
};

export const listAdminConfirmedEnrollments = async (_req, res) => {
  const records = isDatabaseConnected()
    ? await Enrollment.find({}).select("student courseTitle courseRouteId amount currency paymentId orderId paymentProvider createdAt").populate("student", "name email").sort({ createdAt: -1 }).limit(500).lean()
    : listLocalEnrollments().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 500).map((item) => ({ ...item, student: findLocalUserById(item.student) }));
  return res.json({ recordType: "confirmed_enrollment", records: records.map((item) => ({
    id: toId(item),
    studentName: item.student?.name || "Student account",
    studentEmail: item.student?.email || "",
    courseTitle: item.courseTitle || item.courseRouteId || "Course enrollment",
    amount: Number(item.amount || 0),
    currency: item.currency || "INR",
    paymentId: item.paymentId || "",
    orderId: item.orderId || "",
    paymentProvider: item.paymentProvider || "",
    createdAt: item.createdAt
  })) });
};

export const getAdminTestLeaderboard = async (req, res) => {
  const testId = String(req.params.testId || "");
  const test = isDatabaseConnected()
    ? (mongoose.isValidObjectId(testId) ? await OnlineMcqSet.findById(testId).select("title").lean() : null)
    : listLocalOnlineMcqSets().find((item) => toId(item) === testId);
  if (!test) return res.status(404).json({ message: "Test was not found." });
  const filter = { testId, status: "submitted", rankingEligible: { $ne: false }, result: { $ne: null } };
  const participantCount = isDatabaseConnected()
    ? await TestAttempt.countDocuments(filter)
    : listLocalTestAttempts({ testId, status: "submitted" }).filter((item) => item.rankingEligible !== false && item.result).length;
  const attempts = isDatabaseConnected()
    ? await TestAttempt.find(filter).sort({ "result.score": -1, "result.timeTakenSeconds": 1, submittedAt: 1, _id: 1 }).limit(100).lean()
    : listLocalTestAttempts({ testId, status: "submitted" }).filter((item) => item.rankingEligible !== false && item.result)
      .sort((a, b) => Number(b.result.score || 0) - Number(a.result.score || 0) || Number(a.result.timeTakenSeconds || 0) - Number(b.result.timeTakenSeconds || 0) || new Date(a.submittedAt) - new Date(b.submittedAt)).slice(0, 100);
  let previousScore;
  let previousRank = 0;
  const leaderboard = attempts.map((item, index) => {
    const score = Number(item.result.score || 0);
    const rank = previousScore === score ? previousRank : index + 1;
    previousScore = score;
    previousRank = rank;
    return { rank, displayName: `Candidate ${String(index + 1).padStart(2, "0")}`, score, maxMarks: Number(item.result.maxMarks || 0), timeTakenSeconds: Number(item.result.timeTakenSeconds || 0), submittedAt: item.submittedAt };
  });
  return res.json({ testId, title: test.title, participantCount, leaderboard });
};

export const listAdminAuditLogs = async (_req, res) => {
  const logs = isDatabaseConnected()
    ? await AdminAuditLog.find({}).sort({ createdAt: -1 }).limit(200).lean()
    : listLocalAdminAuditLogs(200);
  return res.json({ logs });
};
