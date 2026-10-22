import mongoose from "mongoose";
import OnlineMcqSet from "../models/OnlineMcqSet.js";
import TestAttempt from "../models/TestAttempt.js";
import { isDatabaseConnected } from "../config/db.js";
import {
  createLocalTestAttempt,
  findLocalTestAttempt,
  listLocalOnlineMcqSets,
  listLocalTestAttempts,
  updateLocalTestAttempt
} from "../utils/localPersistence.js";
import { calculateObjectiveResult, calculateRankStats, calculateRankStatsFromCounts } from "../utils/testScoring.js";

const cleanQuestion = (question) => ({ question: question.question, options: question.options || [] });
const isValidId = (value) => mongoose.isValidObjectId(value);
const attemptToObject = (record) => record?.toObject ? record.toObject({ flattenMaps: true }) : record;

const getPublishedTest = async (id) => {
  if (isDatabaseConnected()) {
    if (!isValidId(id)) return null;
    return OnlineMcqSet.findOne({ _id: id, status: "published" }).lean();
  }
  return listLocalOnlineMcqSets().find((item) => String(item._id || item.id) === String(id) && item.status === "published") || null;
};

const getAttempt = async (id) => {
  if (isDatabaseConnected()) {
    if (!isValidId(id)) return null;
    return TestAttempt.findById(id);
  }
  return findLocalTestAttempt(id);
};

const updateAttempt = async (record, patch) => {
  if (record?.save) {
    Object.assign(record, patch);
    return record.save();
  }
  return updateLocalTestAttempt(record._id, patch);
};

const attemptResponse = (record, { includeReview = false } = {}) => {
  const attempt = attemptToObject(record);
  const submitted = attempt.status === "submitted";
  const canReview = submitted && includeReview && attempt.allowReview !== false;
  return {
    id: String(attempt._id),
    testId: attempt.testId,
    title: attempt.testTitle,
    examName: attempt.examName,
    questionCount: (attempt.questions || []).length,
    status: attempt.status,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    submittedAt: attempt.submittedAt,
    durationSeconds: attempt.durationSeconds,
    remainingSeconds: submitted ? 0 : Math.max(0, Math.ceil((new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000)),
    questions: (attempt.questions || []).map((question, index) => ({
      index,
      ...cleanQuestion(question),
      ...(canReview ? { correctAnswer: question.answer, explanation: question.explanation || "" } : {})
    })),
    answers: attempt.answers || {},
    ...(submitted ? { result: attempt.result || null } : {})
  };
};

const finalizeAttempt = async (attempt, submittedAt = new Date()) => {
  const source = attemptToObject(attempt);
  if (source.status === "submitted") return attempt;
  const startedAt = new Date(source.startedAt).getTime();
  const timeTakenSeconds = Math.min(source.durationSeconds, Math.max(0, Math.floor((submittedAt.getTime() - startedAt) / 1000)));
  const result = calculateObjectiveResult({
    questions: source.questions,
    answers: source.answers || {},
    marksPerQuestion: source.marksPerQuestion,
    negativeMarks: source.negativeMarks,
    timeTakenSeconds
  });
  return updateAttempt(attempt, { status: "submitted", submittedAt, result });
};

export const listPublishedTests = async (_req, res) => {
  const sets = isDatabaseConnected()
    ? await OnlineMcqSet.find({ status: "published" }).sort({ createdAt: -1 }).select("title examName questions.question questions.options durationMinutes marksPerQuestion negativeMarks allowReview createdAt").lean()
    : listLocalOnlineMcqSets().filter((item) => item.status === "published");
  return res.json({ tests: sets.map((test) => ({
    id: String(test._id || test.id),
    title: test.title,
    examName: test.examName || "Online MCQ",
    questionCount: (test.questions || []).length,
    durationMinutes: Number(test.durationMinutes || 30),
    marksPerQuestion: Number(test.marksPerQuestion ?? 1),
    negativeMarks: Number(test.negativeMarks ?? 0),
    allowReview: test.allowReview !== false,
    createdAt: test.createdAt
  })) });
};

export const getPublishedTestDetail = async (req, res) => {
  const test = await getPublishedTest(req.params.testId);
  if (!test) return res.status(404).json({ message: "Published test not found." });
  return res.json({
    id: String(test._id || test.id),
    title: test.title,
    examName: test.examName || "Online MCQ",
    questionCount: (test.questions || []).length,
    durationMinutes: Number(test.durationMinutes || 30),
    marksPerQuestion: Number(test.marksPerQuestion ?? 1),
    negativeMarks: Number(test.negativeMarks ?? 0),
    questions: (test.questions || []).map(cleanQuestion)
  });
};

export const startTestAttempt = async (req, res) => {
  const test = await getPublishedTest(req.params.testId);
  if (!test) return res.status(404).json({ message: "Published test not found." });
  if (!Array.isArray(test.questions) || test.questions.length === 0) return res.status(400).json({ message: "This test has no questions yet." });
  const userId = String(req.user._id);
  const testId = String(test._id || test.id);
  const now = new Date();
  const activeAttempt = isDatabaseConnected()
    ? await TestAttempt.findOne({ userId, testId, status: "in_progress" })
    : listLocalTestAttempts({ userId, testId, status: "in_progress" })[0];
  if (activeAttempt && new Date(activeAttempt.deadlineAt).getTime() > now.getTime()) {
    return res.json({ attempt: attemptResponse(activeAttempt) });
  }
  if (activeAttempt) await finalizeAttempt(activeAttempt, new Date(activeAttempt.deadlineAt));

  const durationMinutes = Math.min(240, Math.max(1, Number(test.durationMinutes || 30)));
  const payload = {
    userId,
    testId,
    testTitle: test.title,
    examName: test.examName || "Online MCQ",
    questions: test.questions.map((item) => ({ question: item.question, options: item.options || [], answer: Number(item.answer), explanation: item.explanation || "" })),
    answers: {},
    status: "in_progress",
    startedAt: now,
    deadlineAt: new Date(now.getTime() + durationMinutes * 60_000),
    submittedAt: null,
    durationSeconds: durationMinutes * 60,
    marksPerQuestion: Number(test.marksPerQuestion ?? 1),
    negativeMarks: Number(test.negativeMarks ?? 0),
    allowReview: test.allowReview !== false,
    result: null
  };
  const attempt = isDatabaseConnected() ? await TestAttempt.create(payload) : createLocalTestAttempt(payload);
  return res.status(201).json({ attempt: attemptResponse(attempt) });
};

export const saveTestAttemptAnswers = async (req, res) => {
  const attempt = await getAttempt(req.params.attemptId);
  if (!attempt || String(attempt.userId) !== String(req.user._id)) return res.status(404).json({ message: "Attempt not found." });
  const source = attemptToObject(attempt);
  if (source.status === "submitted") return res.status(409).json({ message: "This attempt has already been submitted." });
  if (Date.now() >= new Date(source.deadlineAt).getTime()) {
    const submitted = await finalizeAttempt(attempt, new Date(source.deadlineAt));
    return res.status(409).json({ message: "Time is up. Your attempt was submitted automatically.", attempt: attemptResponse(submitted, { includeReview: source.allowReview }) });
  }
  const incoming = req.body?.answers;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return res.status(400).json({ message: "Answers must be an object keyed by question number." });
  const answers = {};
  for (const [rawIndex, rawChoice] of Object.entries(incoming)) {
    const index = Number(rawIndex);
    const choice = Number(rawChoice);
    if (!Number.isInteger(index) || index < 0 || index >= source.questions.length || !Number.isInteger(choice) || choice < 0 || choice >= source.questions[index].options.length) {
      return res.status(400).json({ message: "An answer references an invalid question or option." });
    }
    answers[String(index)] = choice;
  }
  const updated = await updateAttempt(attempt, { answers });
  return res.json({ attempt: attemptResponse(updated) });
};

export const submitTestAttempt = async (req, res) => {
  const attempt = await getAttempt(req.params.attemptId);
  if (!attempt || String(attempt.userId) !== String(req.user._id)) return res.status(404).json({ message: "Attempt not found." });
  const source = attemptToObject(attempt);
  if (source.status === "submitted") return res.json({ attempt: attemptResponse(attempt, { includeReview: source.allowReview }) });
  const submittedAt = Date.now() >= new Date(source.deadlineAt).getTime() ? new Date(source.deadlineAt) : new Date();
  const submitted = await finalizeAttempt(attempt, submittedAt);
  return res.json({ attempt: attemptResponse(submitted, { includeReview: source.allowReview }) });
};

export const getMyTestAttempts = async (req, res) => {
  const attempts = isDatabaseConnected()
    ? await TestAttempt.find({ userId: String(req.user._id) }).sort({ createdAt: -1 }).limit(100)
    : listLocalTestAttempts({ userId: req.user._id }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 100);
  return res.json({ attempts: attempts.map((item) => attemptResponse(item, { includeReview: item.status === "submitted" })) });
};

export const getMyTestAttempt = async (req, res) => {
  const attempt = await getAttempt(req.params.attemptId);
  if (!attempt || String(attempt.userId) !== String(req.user._id)) return res.status(404).json({ message: "Attempt not found." });
  let current = attempt;
  if (attempt.status === "in_progress" && Date.now() >= new Date(attempt.deadlineAt).getTime()) current = await finalizeAttempt(attempt, new Date(attempt.deadlineAt));
  const response = attemptResponse(current, { includeReview: current.status === "submitted" && current.allowReview });
  if (current.status === "submitted" && current.result) response.ranking = await getAttemptRanking(current);
  return res.json({ attempt: response });
};

const getAttemptRanking = async (attempt) => {
  const source = attemptToObject(attempt);
  const score = Number(source.result?.score || 0);
  const filters = { testId: String(source.testId), status: "submitted", result: { $ne: null } };
  let participantCount;
  let higherCount;
  let tiedCount;
  if (isDatabaseConnected()) {
    const [total, higher, tied] = await Promise.all([
      TestAttempt.countDocuments(filters),
      TestAttempt.countDocuments({ ...filters, "result.score": { $gt: score } }),
      TestAttempt.countDocuments({ ...filters, "result.score": score })
    ]);
    participantCount = total;
    higherCount = higher;
    tiedCount = tied;
  } else {
    const attempts = listLocalTestAttempts({ testId: String(source.testId), status: "submitted" }).filter((item) => item.result);
    return calculateRankStats(attempts.map((item) => item.result.score), score);
  }
  return calculateRankStatsFromCounts(participantCount, higherCount, tiedCount);
};

export const getTestLeaderboard = async (req, res) => {
  const test = await getPublishedTest(req.params.testId);
  if (!test) return res.status(404).json({ message: "Published test not found." });
  const testId = String(test._id || test.id);
  const participantCount = isDatabaseConnected()
    ? await TestAttempt.countDocuments({ testId, status: "submitted", result: { $ne: null } })
    : listLocalTestAttempts({ testId, status: "submitted" }).filter((item) => item.result).length;
  const attempts = isDatabaseConnected()
    ? await TestAttempt.find({ testId, status: "submitted", result: { $ne: null } }).sort({ "result.score": -1, "result.timeTakenSeconds": 1, submittedAt: 1, _id: 1 }).limit(100).populate("userId", "name").lean()
    : listLocalTestAttempts({ testId, status: "submitted" }).sort((a, b) => Number(b.result?.score || 0) - Number(a.result?.score || 0) || Number(a.result?.timeTakenSeconds || 0) - Number(b.result?.timeTakenSeconds || 0) || new Date(a.submittedAt) - new Date(b.submittedAt)).slice(0, 100).map((attempt) => ({ ...attempt, userId: findLocalUserById(attempt.userId) }));
  let previousScore;
  let previousRank = 0;
  const leaderboard = attempts.map((item, index) => {
    const score = Number(item.result.score);
    const rank = previousScore === score ? previousRank : index + 1;
    previousScore = score;
    previousRank = rank;
    return { rank, displayName: `Candidate ${String(index + 1).padStart(2, "0")}`, score, maxMarks: item.result.maxMarks, timeTakenSeconds: item.result.timeTakenSeconds, submittedAt: item.submittedAt };
  });
  return res.json({ testId, title: test.title, participantCount, leaderboard });
};
