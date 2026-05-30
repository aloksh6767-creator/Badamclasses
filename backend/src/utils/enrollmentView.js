export const resolveEnrollmentCourse = (enrollment) => {
  const item = typeof enrollment?.toObject === "function" ? enrollment.toObject() : { ...enrollment };
  const populatedCourse = item.course && typeof item.course === "object" ? item.course : null;
  const snapshot = item.courseSnapshot && typeof item.courseSnapshot === "object" ? item.courseSnapshot : null;

  return {
    ...item,
    course:
      populatedCourse ||
      (snapshot
        ? {
            ...snapshot,
            _id: snapshot._id || item.courseRouteId,
            id: snapshot.id || item.courseRouteId,
            routeId: snapshot.routeId || item.courseRouteId,
            title: snapshot.title || item.courseTitle || "Purchased Course"
          }
        : {
            _id: item.courseRouteId,
            id: item.courseRouteId,
            routeId: item.courseRouteId,
            title: item.courseTitle || "Purchased Course",
            instructor: "BadamClasses",
            price: item.amount || 0
          })
  };
};

export const resolveEnrollmentList = (enrollments = []) => enrollments.map(resolveEnrollmentCourse);
