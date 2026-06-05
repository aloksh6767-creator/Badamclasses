import express from "express";
import { forgotPassword, login, profile, resetPassword, sendOtp, signup, updateProfile, verifyOtp } from "../controllers/authController.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect } from "../middleware/authMiddleware.js";
import { createRateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

const otpLimiter = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  message: "Too many OTP requests. Please wait a few minutes and try again."
});

const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: "Too many login attempts. Please wait a few minutes and try again."
});

router.post("/send-otp", otpLimiter, asyncHandler(sendOtp));
router.post("/verify-otp", otpLimiter, asyncHandler(verifyOtp));
router.post("/signup", authLimiter, asyncHandler(signup));
router.post("/login", authLimiter, asyncHandler(login));
router.post("/forgot-password", otpLimiter, asyncHandler(forgotPassword));
router.post("/reset-password", otpLimiter, asyncHandler(resetPassword));
router.get("/me", protect, asyncHandler(profile));
router.patch("/me", protect, asyncHandler(updateProfile));

export default router;
