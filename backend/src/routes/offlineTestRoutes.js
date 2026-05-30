import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, staffOnly } from "../middleware/authMiddleware.js";
import {
  listOfflineTestRegistrationsAdmin,
  listPublishedOfflineTests,
  lookupOfflineTestResults,
  registerOfflineTest,
  updateOfflineTestResultAdmin
} from "../controllers/offlineTestController.js";

const router = express.Router();

router.get("/", asyncHandler(listPublishedOfflineTests));
router.get("/results", asyncHandler(lookupOfflineTestResults));
router.post("/register", asyncHandler(registerOfflineTest));
router.get("/admin", protect, staffOnly, asyncHandler(listOfflineTestRegistrationsAdmin));
router.patch("/admin/:id/result", protect, staffOnly, asyncHandler(updateOfflineTestResultAdmin));

export default router;
