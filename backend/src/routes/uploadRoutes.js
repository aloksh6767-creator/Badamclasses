import express from "express";
import { upload, uploadMedia } from "../controllers/uploadController.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, adminOnly, upload.single("file"), asyncHandler(uploadMedia));

export default router;
