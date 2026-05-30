import express from "express";
import {
  confirmCheckoutSessionAndEnroll,
  confirmPaymentAndEnroll,
  createCheckoutSession,
  createQrCheckoutSession,
  getPaymentDebug,
  getQrCheckoutStatus,
  validateUpiId
} from "../controllers/paymentController.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/debug", asyncHandler(getPaymentDebug));
router.post("/checkout", protect, asyncHandler(createCheckoutSession));
router.post("/checkout/qr", protect, asyncHandler(createQrCheckoutSession));
router.post("/validate-upi", protect, asyncHandler(validateUpiId));
router.post("/confirm", protect, asyncHandler(confirmPaymentAndEnroll));
router.post("/confirm-session", protect, asyncHandler(confirmCheckoutSessionAndEnroll));
router.get("/checkout/qr/:qrId/status", protect, asyncHandler(getQrCheckoutStatus));

export default router;
