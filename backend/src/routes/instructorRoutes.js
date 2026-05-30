import express from "express";
import {
  addPdf,
  addVideo,
  createCourse,
  deleteCourse,
  getInstructorCourses,
  getInstructorStudents,
  updateCourseLive,
  updateCourse
} from "../controllers/instructorController.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get("/courses", asyncHandler(getInstructorCourses));
router.get("/students", asyncHandler(getInstructorStudents));
router.post("/courses", asyncHandler(createCourse));
router.patch("/courses/live/:courseKey", asyncHandler(updateCourseLive));
router.patch("/courses/:id", asyncHandler(updateCourse));
router.delete("/courses/:id", asyncHandler(deleteCourse));
router.post("/courses/:id/videos", asyncHandler(addVideo));
router.post("/courses/:id/pdf", asyncHandler(addPdf));
router.post("/courses/:id/pdfs", asyncHandler(addPdf));

export default router;
