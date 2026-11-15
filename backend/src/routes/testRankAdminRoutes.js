import express from "express";
import {
  createAdminTestSet,
  getAdminTestLeaderboard,
  getAdminTestSet,
  getAdminTestAnalytics,
  listAdminAuditLogs,
  listAdminConfirmedEnrollments,
  listAdminQuestionBank,
  listAdminStudents,
  listAdminTestSets,
  setAdminTestStatus,
  updateAdminTestSet
} from "../controllers/testRankAdminController.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect, adminOnly);

router.get("/tests", asyncHandler(listAdminTestSets));
router.post("/tests", asyncHandler(createAdminTestSet));
router.get("/tests/:testId", asyncHandler(getAdminTestSet));
router.put("/tests/:testId", asyncHandler(updateAdminTestSet));
router.patch("/tests/:testId/status", asyncHandler(setAdminTestStatus));
router.get("/questions", asyncHandler(listAdminQuestionBank));
router.get("/analytics", asyncHandler(getAdminTestAnalytics));
router.get("/leaderboards/:testId", asyncHandler(getAdminTestLeaderboard));
router.get("/students", asyncHandler(listAdminStudents));
router.get("/enrollments", asyncHandler(listAdminConfirmedEnrollments));
router.get("/audit-logs", asyncHandler(listAdminAuditLogs));

export default router;
