import express from "express";
import { getDashboard, getWishlist, removeWishlistItem } from "../controllers/studentController.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/dashboard", asyncHandler(getDashboard));
router.get("/wishlist", asyncHandler(getWishlist));
router.delete("/wishlist/:courseId", asyncHandler(removeWishlistItem));

export default router;
