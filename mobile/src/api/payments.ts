import { Course } from "@/data/fallbackCourses";
import { courseKey } from "@/utils/format";
import { apiFetch } from "./client";

export const createPaymentOrder = (course: Course) => {
  return apiFetch("/payments/create-order", {
    method: "POST",
    body: JSON.stringify({
      courseId: courseKey(course),
      courseTitle: course.title,
      amount: Number(course.offerPrice || course.priceValue || 0)
    })
  });
};
