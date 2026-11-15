import express from "express";
import {
  getMyTestAttempt,
  getMyTestAttempts,
  getPublishedTestDetail,
  getTestLeaderboard,
  listPublishedTests,
  retryIncorrectQuestions,
  saveTestAttemptAnswers,
  startTestAttempt,
  submitTestAttempt
} from "../controllers/testRankController.js";
import { getStudentSessionId, optionalProtect, protect, requireStudentSession } from "../middleware/authMiddleware.js";
import { createRateLimit } from "../middleware/rateLimit.js";
import { createStudentAiMock, getMyStudentAiMocks, getStudentAiMockConfig } from "../controllers/studentAiMockController.js";
import StudentAiMockTest from "../models/StudentAiMockTest.js";
import TestAttempt from "../models/TestAttempt.js";

const router = express.Router();
const asyncHandler = (handler) => {
  const wrapped = (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
  Object.defineProperty(wrapped, "name", { value: handler.name || "asyncHandler" });
  return wrapped;
};
const requireOwnedAiMockForGuest = asyncHandler(async function requireOwnedAiMockForGuest(req, res, next) {
  if (!req.isGuestStudent) return next();
  const mock = await StudentAiMockTest.findOne({ _id: req.params.testId, ownerId: getStudentSessionId(req), status: "ready" }).select("_id").lean();
  if (!mock) return res.status(404).json({ message: "This guest session can only start its own AI practice mocks." });
  return next();
});
const requireOwnedAiAttemptForGuest = asyncHandler(async function requireOwnedAiAttemptForGuest(req, res, next) {
  if (!req.isGuestStudent) return next();
  const attempt = await TestAttempt.findOne({ _id: req.params.attemptId, userId: getStudentSessionId(req) }).select("testId").lean();
  if (!attempt) return res.status(404).json({ message: "Attempt not found." });
  const mock = await StudentAiMockTest.findOne({ _id: attempt.testId, ownerId: getStudentSessionId(req), status: "ready" }).select("_id").lean();
  if (!mock) return res.status(404).json({ message: "Guest attempts are limited to AI practice mocks created in this browser." });
  return next();
});

router.get("/tests", asyncHandler(listPublishedTests));
router.get("/tests/:testId/leaderboard", asyncHandler(getTestLeaderboard));
router.get("/ai-mocks/config", optionalProtect, requireStudentSession, asyncHandler(getStudentAiMockConfig));
router.get("/ai-mocks/mine", optionalProtect, requireStudentSession, asyncHandler(getMyStudentAiMocks));
router.post("/ai-mocks", optionalProtect, requireStudentSession, createRateLimit({ windowMs: 60_000, max: 3, message: "Too many AI mock requests. Please wait a minute." }), asyncHandler(createStudentAiMock));
router.get("/tests/:testId", optionalProtect, requireStudentSession, asyncHandler(getPublishedTestDetail));
router.post("/tests/:testId/attempts", optionalProtect, requireStudentSession, requireOwnedAiMockForGuest, asyncHandler(startTestAttempt));
router.get("/attempts", protect, asyncHandler(getMyTestAttempts));
router.get("/attempts/:attemptId", optionalProtect, requireStudentSession, requireOwnedAiAttemptForGuest, asyncHandler(getMyTestAttempt));
router.put("/attempts/:attemptId/answers", optionalProtect, requireStudentSession, requireOwnedAiAttemptForGuest, asyncHandler(saveTestAttemptAnswers));
router.post("/attempts/:attemptId/submit", optionalProtect, requireStudentSession, requireOwnedAiAttemptForGuest, asyncHandler(submitTestAttempt));
router.post("/attempts/:attemptId/retry-incorrect", optionalProtect, requireStudentSession, requireOwnedAiAttemptForGuest, asyncHandler(retryIncorrectQuestions));

export default router;
