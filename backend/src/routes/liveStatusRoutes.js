import { Router } from "express";
import { getLiveStatus } from "../controllers/liveStatusController.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getLiveStatus));

export default router;
