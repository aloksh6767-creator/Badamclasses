import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, staffOnly } from "../middleware/authMiddleware.js";
import { createInquiry, listInquiriesAdmin } from "../controllers/inquiryController.js";

const router = express.Router();

router.post("/", asyncHandler(createInquiry));
router.get("/admin", protect, staffOnly, asyncHandler(listInquiriesAdmin));

export default router;
