import express from "express";
import {
  getMyTestAttempt,
  getMyTestAttempts,
  getPublishedTestDetail,
  getTestLeaderboard,
  listPublishedTests,
  saveTestAttemptAnswers,
  startTestAttempt,
  submitTestAttempt
} from "../controllers/testRankController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/tests", asyncHandler(listPublishedTests));
router.get("/tests/:testId/leaderboard", asyncHandler(getTestLeaderboard));
router.get("/tests/:testId", asyncHandler(getPublishedTestDetail));
router.post("/tests/:testId/attempts", protect, asyncHandler(startTestAttempt));
router.get("/attempts", protect, asyncHandler(getMyTestAttempts));
router.get("/attempts/:attemptId", protect, asyncHandler(getMyTestAttempt));
router.put("/attempts/:attemptId/answers", protect, asyncHandler(saveTestAttemptAnswers));
router.post("/attempts/:attemptId/submit", protect, asyncHandler(submitTestAttempt));

export default router;
