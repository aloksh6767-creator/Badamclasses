"use client";

import { buildCourseRouteId } from "@/lib/courseIdentity";
import { readUserScopedJson, writeUserScopedJson } from "@/lib/userScopedStorage";

export const LOCAL_PURCHASE_KEY = "badamclasses_purchased_courses";

const normalizeValue = (value) => String(value || "").trim().toLowerCase();

export function readLocalPurchases() {
  if (typeof window === "undefined") return [];
  const parsed = readUserScopedJson(LOCAL_PURCHASE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveLocalPurchase(course = {}) {
  if (typeof window === "undefined") return [];

  const routeId = String(course.routeId || buildCourseRouteId(course) || "").trim();
  const courseId = String(course._id || course.id || routeId || "").trim();
  const courseTitle = String(course.title || "").trim();
  if (!courseId && !routeId) return readLocalPurchases();

  const current = readLocalPurchases();
  const next = [
    {
      id: courseId || routeId,
      courseId,
      routeId,
      title: courseTitle,
      purchasedAt: new Date().toISOString()
    },
    ...current.filter((item) => {
      const sameId =
        normalizeValue(item.id) === normalizeValue(courseId || routeId) ||
        normalizeValue(item.courseId) === normalizeValue(courseId) ||
        normalizeValue(item.routeId) === normalizeValue(routeId);
      const sameTitle = normalizeValue(item.title) === normalizeValue(courseTitle);
      return !(sameId || sameTitle);
    })
  ];

  writeUserScopedJson(LOCAL_PURCHASE_KEY, next);
  return next;
}

export function hasLocalPurchase(course = {}) {
  const routeId = String(course.routeId || buildCourseRouteId(course) || "").trim();
  const courseId = String(course._id || course.id || routeId || "").trim();
  const courseTitle = String(course.title || "").trim();

  return readLocalPurchases().some((item) => {
    return (
      normalizeValue(item.id) === normalizeValue(courseId || routeId) ||
      normalizeValue(item.courseId) === normalizeValue(courseId) ||
      normalizeValue(item.routeId) === normalizeValue(routeId) ||
      normalizeValue(item.title) === normalizeValue(courseTitle)
    );
  });
}
