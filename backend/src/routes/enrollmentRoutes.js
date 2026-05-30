import express from "express";
import { downloadInvoice, getMyEnrollments, updateProgress } from "../controllers/enrollmentController.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/my", protect, asyncHandler(getMyEnrollments));
router.get("/:id/invoice", protect, asyncHandler(downloadInvoice));
router.patch("/:id/progress", protect, asyncHandler(updateProgress));

export default router;
