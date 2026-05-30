import express from "express";
import {
  approveAutomationContentProposal,
  createAutomationContentProposal,
  getAutomationDashboard,
  getAutomationPublicMcqSets,
  getAutomationPublicContent,
  handleTelegramAdminWebhook,
  patchAutomationFeatureFlags,
  rejectAutomationContentProposal,
  runAutomationBackup,
  undoAutomationContentChange
} from "../controllers/automationController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/public-content", getAutomationPublicContent);
router.get("/public-mcqs", getAutomationPublicMcqSets);
router.post("/telegram/webhook", handleTelegramAdminWebhook);

router.get("/dashboard", protect, adminOnly, getAutomationDashboard);
router.patch("/feature-flags", protect, adminOnly, patchAutomationFeatureFlags);
router.post("/content/propose", protect, adminOnly, createAutomationContentProposal);
router.post("/content/approve/:pendingId", protect, adminOnly, approveAutomationContentProposal);
router.post("/content/reject/:pendingId", protect, adminOnly, rejectAutomationContentProposal);
router.post("/content/undo", protect, adminOnly, undoAutomationContentChange);
router.post("/backups/run", protect, adminOnly, runAutomationBackup);

export default router;
