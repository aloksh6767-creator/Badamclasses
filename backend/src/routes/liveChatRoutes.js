import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect, staffOnly } from "../middleware/authMiddleware.js";
import { createLiveChatMessage, listLiveChatMessages } from "../controllers/liveChatController.js";

const router = Router();

router.post("/", protect, asyncHandler(createLiveChatMessage));
router.get("/", protect, asyncHandler(listLiveChatMessages));
router.get("/admin", protect, staffOnly, asyncHandler(listLiveChatMessages));

export default router;
