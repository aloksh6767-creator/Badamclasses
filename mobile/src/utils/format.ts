export const formatRupees = (value: number | string | undefined) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN")}`;
};

export const courseKey = (course: { routeId?: string; id?: string; _id?: string; title?: string }) => {
  return String(course.routeId || course.id || course._id || course.title || "").trim();
};
