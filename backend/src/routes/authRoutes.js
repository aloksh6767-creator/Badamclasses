import express from "express";
import { forgotPassword, login, profile, resetPassword, sendOtp, signup, updateProfile, verifyOtp } from "../controllers/authController.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/send-otp", asyncHandler(sendOtp));
router.post("/verify-otp", asyncHandler(verifyOtp));
router.post("/signup", asyncHandler(signup));
router.post("/login", asyncHandler(login));
router.post("/forgot-password", asyncHandler(forgotPassword));
router.post("/reset-password", asyncHandler(resetPassword));
router.get("/me", protect, asyncHandler(profile));
router.patch("/me", protect, asyncHandler(updateProfile));

export default router;
