import express from "express";
import {
  approveAutomationContentProposal,
  createAutomationContentProposal,
  getAutomationDashboard,
  getAutomationPublicMcqSets,
  getAutomationPublicPdfMocks,
  getAutomationStudentPdfMocks,
  getAutomationPublicContent,
  handleTelegramAdminWebhook,
  patchAutomationFeatureFlags,
  rejectAutomationContentProposal,
  runAutomationBackup,
  undoAutomationContentChange
} from "../controllers/automationController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import {
  archiveDailyAiMockTest,
  getDailyAiMockAdminDashboard,
  getDailyAiMockAdminPreview,
  getPublicDailyAiMockTests,
  patchDailyAiMockSettings,
  publishReviewedDailyAiMockTest,
  retryDailyAiMockJob,
  runDailyAiMockManually,
  saveDailyAiMockBlueprint
} from "../controllers/dailyAiMockController.js";

const router = express.Router();

router.get("/public-content", getAutomationPublicContent);
router.get("/public-mcqs", getAutomationPublicMcqSets);
router.get("/public-pdf-mocks", getAutomationPublicPdfMocks);
router.get("/student-pdf-mocks", protect, getAutomationStudentPdfMocks);
router.get("/daily-ai-mocks", getPublicDailyAiMockTests);
router.post("/telegram/webhook", handleTelegramAdminWebhook);

router.get("/dashboard", protect, adminOnly, getAutomationDashboard);
router.patch("/feature-flags", protect, adminOnly, patchAutomationFeatureFlags);
router.post("/content/propose", protect, adminOnly, createAutomationContentProposal);
router.post("/content/approve/:pendingId", protect, adminOnly, approveAutomationContentProposal);
router.post("/content/reject/:pendingId", protect, adminOnly, rejectAutomationContentProposal);
router.post("/content/undo", protect, adminOnly, undoAutomationContentChange);
router.post("/backups/run", protect, adminOnly, runAutomationBackup);
router.get("/daily-ai-mocks/admin/dashboard", protect, adminOnly, getDailyAiMockAdminDashboard);
router.patch("/daily-ai-mocks/admin/settings", protect, adminOnly, patchDailyAiMockSettings);
router.put("/daily-ai-mocks/admin/blueprints", protect, adminOnly, saveDailyAiMockBlueprint);
router.post("/daily-ai-mocks/admin/run", protect, adminOnly, runDailyAiMockManually);
router.post("/daily-ai-mocks/admin/jobs/:jobId/retry", protect, adminOnly, retryDailyAiMockJob);
router.get("/daily-ai-mocks/admin/tests/:testId", protect, adminOnly, getDailyAiMockAdminPreview);
router.post("/daily-ai-mocks/admin/tests/:testId/archive", protect, adminOnly, archiveDailyAiMockTest);
router.post("/daily-ai-mocks/admin/tests/:testId/publish", protect, adminOnly, publishReviewedDailyAiMockTest);

export default router;
