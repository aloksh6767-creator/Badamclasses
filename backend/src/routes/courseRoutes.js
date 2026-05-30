import express from "express";
import {
  addReview,
  addToWishlist,
  getCourseById,
  getCourses
} from "../controllers/courseController.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { protect } from "../middleware/authMiddleware.js";
import requireDatabase from "../middleware/requireDatabase.js";

const router = express.Router();

router.get("/", asyncHandler(getCourses));
router.get("/:id", asyncHandler(getCourseById));
router.post("/:id/reviews", protect, requireDatabase, asyncHandler(addReview));
router.post("/:id/wishlist", protect, requireDatabase, asyncHandler(addToWishlist));

export default router;
