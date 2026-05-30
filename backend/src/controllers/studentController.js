import Wishlist from "../models/Wishlist.js";
import Enrollment from "../models/Enrollment.js";
import { isDatabaseConnected } from "../config/db.js";
import { resolveEnrollmentList } from "../utils/enrollmentView.js";
import { listLocalEnrollmentsByStudent } from "../utils/localPersistence.js";

export const getDashboard = async (req, res) => {
  const enrollments = isDatabaseConnected()
    ? await Enrollment.find({ student: req.user._id }).populate({
        path: "course",
        populate: { path: "instructor", select: "name" }
      })
    : listLocalEnrollmentsByStudent(req.user._id);
  const resolvedEnrollments = resolveEnrollmentList(enrollments);

  const wishlist = isDatabaseConnected() ? await Wishlist.find({ student: req.user._id }).populate("course") : [];

  res.json({
    purchasedCourses: resolvedEnrollments,
    wishlist,
    stats: {
      totalCourses: resolvedEnrollments.length,
      completedCourses: resolvedEnrollments.filter((item) => item.completed).length
    }
  });
};

export const getWishlist = async (req, res) => {
  if (!isDatabaseConnected()) {
    return res.json([]);
  }
  const wishlist = await Wishlist.find({ student: req.user._id }).populate({
    path: "course",
    populate: { path: "instructor", select: "name" }
  });
  res.json(wishlist);
};

export const removeWishlistItem = async (req, res) => {
  if (!isDatabaseConnected()) {
    return res.json({ message: "Removed from wishlist" });
  }
  await Wishlist.findOneAndDelete({ student: req.user._id, course: req.params.courseId });
  res.json({ message: "Removed from wishlist" });
};
