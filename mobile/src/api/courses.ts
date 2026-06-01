import AsyncStorage from "@react-native-async-storage/async-storage";
import { Course, fallbackCourses } from "@/data/fallbackCourses";
import { apiFetch } from "./client";

const COURSE_CACHE_KEY = "badamclasses_mobile_courses";
const ENROLLMENT_CACHE_KEY = "badamclasses_mobile_enrollments";

type CourseResponse = { courses?: Course[]; data?: Course[] } | Course[];
type EnrollmentResponse = { enrollments?: Course[]; data?: Course[] } | Course[];

const normalizeCourses = (payload: CourseResponse): Course[] => {
  if (Array.isArray(payload)) return payload;
  return payload.courses || payload.data || [];
};

export const getCourses = async () => {
  try {
    const payload = await apiFetch<CourseResponse>("/courses");
    const courses = normalizeCourses(payload);
    if (courses.length) {
      await AsyncStorage.setItem(COURSE_CACHE_KEY, JSON.stringify(courses));
      return courses;
    }
  } catch {
    const cached = await AsyncStorage.getItem(COURSE_CACHE_KEY);
    if (cached) return JSON.parse(cached) as Course[];
  }

  return fallbackCourses;
};

export const getEnrollments = async () => {
  try {
    const payload = await apiFetch<EnrollmentResponse>("/enrollments");
    const enrollments = Array.isArray(payload) ? payload : payload.enrollments || payload.data || [];
    await AsyncStorage.setItem(ENROLLMENT_CACHE_KEY, JSON.stringify(enrollments));
    return enrollments;
  } catch {
    const cached = await AsyncStorage.getItem(ENROLLMENT_CACHE_KEY);
    return cached ? (JSON.parse(cached) as Course[]) : [];
  }
};

export const createInquiry = (body: { name: string; phone: string; message: string }) => {
  return apiFetch("/inquiries", { method: "POST", body: JSON.stringify(body) });
};
