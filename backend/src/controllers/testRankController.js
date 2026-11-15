import mongoose from "mongoose";
import OnlineMcqSet from "../models/OnlineMcqSet.js";
import DailyAiMockTest from "../models/DailyAiMockTest.js";
import StudentAiMockTest from "../models/StudentAiMockTest.js";
import TestAttempt from "../models/TestAttempt.js";
import { getStudentSessionId } from "../middleware/authMiddleware.js";
import { isDatabaseConnected } from "../config/db.js";
import {
  createLocalTestAttempt,
  findLocalTestAttempt,
  findLocalUserById,
  listLocalOnlineMcqSets,
  listLocalTestAttempts,
  updateLocalTestAttempt
} from "../utils/localPersistence.js";
import { calculateObjectiveResult, calculateRankStats, calculateRankStatsFromCounts } from "../utils/testScoring.js";

export const cleanPublicTestQuestion = (question) => ({ question: question.question, options: question.options || [] });
const isValidId = (value) => mongoose.isValidObjectId(value);
const attemptToObject = (record) => record?.toObject ? record.toObject({ flattenMaps: true }) : record;

const getPublishedTest = async (id, userId = "") => {
  if (isDatabaseConnected()) {
    if (!isValidId(id)) return null;
    return await OnlineMcqSet.findOne({ _id: id, status: "published" }).lean()
      || await DailyAiMockTest.findOne({ _id: id, status: "published", scheduledPublicationDate: { $lte: new Date() } }).lean()
      || (userId ? await StudentAiMockTest.findOne({ _id: id, ownerId: userId, status: "ready" }).lean() : null);
  }
  return listLocalOnlineMcqSets().find((item) => String(item._id || item.id) === String(id) && item.status === "published") || null;
};

const testAvailability = (test) => {
  const now = Date.now();
  const opensAt = test.publishAt || test.scheduledPublicationDate || null;
  const closesAt = test.closeAt || null;
  const opensAtMs = opensAt ? new Date(opensAt).getTime() : 0;
  const closesAtMs = closesAt ? new Date(closesAt).getTime() : 0;
  return {
    isOpen: (!opensAtMs || opensAtMs <= now) && (!closesAtMs || closesAtMs >= now),
    opensAt,
    closesAt
  };
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
    rankingEligible: attempt.rankingEligible !== false,
    remainingSeconds: submitted ? 0 : Math.max(0, Math.ceil((new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000)),
    questions: (attempt.questions || []).map((question, index) => ({
      index,
      ...cleanPublicTestQuestion(question),
      subject: question.subject || "",
      section: question.section || "",
      topic: question.topic || "",
      difficulty: question.difficulty || "",
      language: question.language || "",
      ...(canReview ? {
        correctAnswer: question.answer,
        explanation: question.explanation || ""
      } : {})
    })),
    answers: attempt.answers || {},
    ...(submitted ? { result: attempt.result || null } : {})
  };
};

export const finalizeAttempt = async (attempt, submittedAt = new Date()) => {
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
  const now = new Date();
  const publishedFilter = {
    status: "published",
    $and: [
      { $or: [{ publishAt: null }, { publishAt: { $exists: false } }, { publishAt: { $lte: now } }] },
      { $or: [{ closeAt: null }, { closeAt: { $exists: false } }, { closeAt: { $gte: now } }] }
    ]
  };
  const sets = isDatabaseConnected()
    ? await OnlineMcqSet.find(publishedFilter).sort({ createdAt: -1 }).select("title examName examFamily testType subject questions.question questions.options durationMinutes marksPerQuestion negativeMarks allowReview createdAt").lean()
    : listLocalOnlineMcqSets().filter((item) => item.status === "published"
      && (!item.publishAt || new Date(item.publishAt).getTime() <= now.getTime())
      && (!item.closeAt || new Date(item.closeAt).getTime() >= now.getTime()));
  const dailySets = isDatabaseConnected()
    ? await DailyAiMockTest.find({ status: "published", scheduledPublicationDate: { $lte: new Date() } }).sort({ createdAt: -1 }).select("title examName examFamily examTier testType subject sections totalQuestions totalMarks language difficulty questions.question questions.options durationMinutes marksPerQuestion negativeMarks allowReview blueprintVersion generationDate createdAt").lean()
    : [];
  const combinedSets = [...sets, ...dailySets].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return res.json({ tests: combinedSets.map((test) => ({
    id: String(test._id || test.id),
    title: test.title,
    examName: test.examName || "Online MCQ",
    examFamily: test.examFamily || "",
    examTier: test.examTier || "",
    testType: test.testType || "",
    subject: test.subject || "",
    sections: test.sections || [],
    totalMarks: test.totalMarks || 0,
    language: test.language || "",
    difficulty: test.difficulty || "",
    generationDate: test.generationDate || "",
    blueprintVersion: test.blueprintVersion || null,
    topic: test.topic || "",
    questionCount: (test.questions || []).length,
    durationMinutes: Number(test.durationMinutes || 30),
    marksPerQuestion: Number(test.marksPerQuestion ?? 1),
    negativeMarks: Number(test.negativeMarks ?? 0),
    allowReview: test.allowReview !== false,
    createdAt: test.createdAt
  })) });
};

export const toPublicTestSummary = (test) => ({
    id: String(test._id || test.id),
    title: test.title,
    examName: test.examName || "Online MCQ",
    examFamily: test.examFamily || "",
    examTier: test.examTier || "",
    testType: test.testType || "",
    subject: test.subject || "",
    sections: test.sections || [],
    totalMarks: test.totalMarks || 0,
    language: test.language || "",
    difficulty: test.difficulty || "",
    generationDate: test.generationDate || "",
    blueprintVersion: test.blueprintVersion || null,
    isAiGenerated: Boolean(test.ownerId || test.generatorVersion?.includes("student-ai-mock")),
    practiceLabel: test.ownerId ? "AI-generated practice · not an official-pattern test" : test.source || "",
    availability: testAvailability(test),
    topic: test.topic || "",
    questionCount: (test.questions || []).length,
    durationMinutes: Number(test.durationMinutes || 30),
    marksPerQuestion: Number(test.marksPerQuestion ?? 1),
    negativeMarks: Number(test.negativeMarks ?? 0)
});

export const getPublishedTestDetail = async (req, res) => {
  const test = await getPublishedTest(req.params.testId, getStudentSessionId(req));
  if (!test) return res.status(404).json({ message: "Test not found or access is unavailable." });
  return res.json(toPublicTestSummary(test));
};

export const startTestAttempt = async (req, res) => {
  const test = await getPublishedTest(req.params.testId, getStudentSessionId(req));
  if (!test) return res.status(404).json({ message: "Test not found or access is unavailable." });
  if (!Array.isArray(test.questions) || test.questions.length === 0) return res.status(400).json({ message: "This test has no questions yet." });
  const userId = getStudentSessionId(req);
  const testId = String(test._id || test.id);
  const now = new Date();
  const activeAttempt = isDatabaseConnected()
    ? await TestAttempt.findOne({ userId, testId, status: "in_progress" })
    : listLocalTestAttempts({ userId, testId, status: "in_progress" })[0];
  if (activeAttempt && new Date(activeAttempt.deadlineAt).getTime() > now.getTime()) {
    return res.json({ attempt: attemptResponse(activeAttempt) });
  }
  if (activeAttempt) await finalizeAttempt(activeAttempt, new Date(activeAttempt.deadlineAt));
  if (!testAvailability(test).isOpen) return res.status(409).json({ message: "This test is outside its scheduled availability window." });

  const durationMinutes = Math.min(240, Math.max(1, Number(test.durationMinutes || 30)));
  const payload = {
    userId,
    testId,
    testTitle: test.title,
    examName: test.examName || "Online MCQ",
    questions: test.questions.map((item) => ({
      question: item.question,
      options: item.options || [],
      answer: Number(item.answer),
      explanation: item.explanation || "",
      subject: item.subject || "",
      section: item.section || "",
      topic: item.topic || "",
      difficulty: item.difficulty || "",
      language: item.language || ""
    })),
    answers: {},
    status: "in_progress",
    startedAt: now,
    deadlineAt: new Date(now.getTime() + durationMinutes * 60_000),
    submittedAt: null,
    durationSeconds: durationMinutes * 60,
    marksPerQuestion: Number(test.marksPerQuestion ?? 1),
    negativeMarks: Number(test.negativeMarks ?? 0),
    allowReview: test.allowReview !== false,
    rankingEligible: !req.isGuestStudent && !test.ownerId,
    result: null
  };
  const attempt = isDatabaseConnected() ? await TestAttempt.create(payload) : createLocalTestAttempt(payload);
  return res.status(201).json({ attempt: attemptResponse(attempt) });
};

export const saveTestAttemptAnswers = async (req, res) => {
  const attempt = await getAttempt(req.params.attemptId);
  if (!attempt || String(attempt.userId) !== getStudentSessionId(req)) return res.status(404).json({ message: "Attempt not found." });
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
  if (!attempt || String(attempt.userId) !== getStudentSessionId(req)) return res.status(404).json({ message: "Attempt not found." });
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
  if (!attempt || String(attempt.userId) !== getStudentSessionId(req)) return res.status(404).json({ message: "Attempt not found." });
  let current = attempt;
  if (attempt.status === "in_progress" && Date.now() >= new Date(attempt.deadlineAt).getTime()) current = await finalizeAttempt(attempt, new Date(attempt.deadlineAt));
  const response = attemptResponse(current, { includeReview: current.status === "submitted" && current.allowReview });
  if (current.status === "submitted" && current.result && current.rankingEligible !== false) response.ranking = await getAttemptRanking(current);
  return res.json({ attempt: response });
};

const getAttemptRanking = async (attempt) => {
  const source = attemptToObject(attempt);
  const score = Number(source.result?.score || 0);
  const filters = { testId: String(source.testId), status: "submitted", rankingEligible: { $ne: false }, result: { $ne: null } };
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
    const attempts = listLocalTestAttempts({ testId: String(source.testId), status: "submitted" })
      .filter((item) => item.result && item.rankingEligible !== false);
    return calculateRankStats(attempts.map((item) => item.result.score), score);
  }
  return calculateRankStatsFromCounts(participantCount, higherCount, tiedCount);
};

export const retryIncorrectQuestions = async (req, res) => {
  const sourceAttempt = await getAttempt(req.params.attemptId);
  if (!sourceAttempt || String(sourceAttempt.userId) !== getStudentSessionId(req)) {
    return res.status(404).json({ message: "Attempt not found." });
  }
  const source = attemptToObject(sourceAttempt);
  if (source.status !== "submitted") return res.status(409).json({ message: "Submit the original test before retrying incorrect questions." });
  if (source.allowReview === false) return res.status(403).json({ message: "Answer review is not enabled for this test." });

  const answers = source.answers || {};
  const incorrectQuestions = (source.questions || []).filter((question, index) => {
    const selected = answers[String(index)];
    return Number.isInteger(Number(selected)) && Number(selected) !== Number(question.answer);
  });
  if (!incorrectQuestions.length) return res.status(400).json({ message: "There are no incorrect answers to retry." });

  const userId = getStudentSessionId(req);
  const testId = String(source.testId);
  const existing = isDatabaseConnected()
    ? await TestAttempt.findOne({ userId, testId, status: "in_progress" })
    : listLocalTestAttempts({ userId, testId, status: "in_progress" }).find((item) => new Date(item.deadlineAt).getTime() > Date.now());
  if (existing && new Date(existing.deadlineAt).getTime() > Date.now()) {
    return res.status(409).json({ message: "Finish your active attempt for this test before starting an incorrect-answer retry." });
  }

  const perQuestionSeconds = Math.max(30, Math.ceil(Number(source.durationSeconds || 0) / Math.max(1, source.questions.length)));
  const durationSeconds = Math.min(3600, Math.max(60, perQuestionSeconds * incorrectQuestions.length));
  const now = new Date();
  const payload = {
    userId,
    testId,
    testTitle: `${source.testTitle} · Incorrect answer practice`,
    examName: source.examName || "Online MCQ",
    questions: incorrectQuestions.map((question) => ({
      question: question.question,
      options: question.options || [],
      answer: Number(question.answer),
      explanation: question.explanation || "",
      subject: question.subject || "",
      section: question.section || "",
      topic: question.topic || "",
      difficulty: question.difficulty || "",
      language: question.language || ""
    })),
    answers: {},
    status: "in_progress",
    startedAt: now,
    deadlineAt: new Date(now.getTime() + durationSeconds * 1000),
    submittedAt: null,
    durationSeconds,
    marksPerQuestion: Number(source.marksPerQuestion ?? 1),
    negativeMarks: Number(source.negativeMarks ?? 0),
    allowReview: true,
    rankingEligible: false,
    result: null
  };
  const attempt = isDatabaseConnected() ? await TestAttempt.create(payload) : createLocalTestAttempt(payload);
  return res.status(201).json({ attempt: attemptResponse(attempt), questionCount: incorrectQuestions.length });
};

export const getTestLeaderboard = async (req, res) => {
  const test = await getPublishedTest(req.params.testId);
  if (!test) return res.status(404).json({ message: "Published test not found." });
  const testId = String(test._id || test.id);
  const participantCount = isDatabaseConnected()
    ? await TestAttempt.countDocuments({ testId, status: "submitted", rankingEligible: { $ne: false }, result: { $ne: null } })
    : listLocalTestAttempts({ testId, status: "submitted" }).filter((item) => item.result && item.rankingEligible !== false).length;
  const attempts = isDatabaseConnected()
    ? await TestAttempt.find({ testId, status: "submitted", rankingEligible: { $ne: false }, result: { $ne: null } }).sort({ "result.score": -1, "result.timeTakenSeconds": 1, submittedAt: 1, _id: 1 }).limit(100).populate("userId", "name").lean()
    : listLocalTestAttempts({ testId, status: "submitted" }).filter((item) => item.rankingEligible !== false).sort((a, b) => Number(b.result?.score || 0) - Number(a.result?.score || 0) || Number(a.result?.timeTakenSeconds || 0) - Number(b.result?.timeTakenSeconds || 0) || new Date(a.submittedAt) - new Date(b.submittedAt)).slice(0, 100).map((attempt) => ({ ...attempt, userId: findLocalUserById(attempt.userId) }));
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
