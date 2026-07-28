const siteUrl = "https://www.badamclasses.in";

export default function sitemap() {
  const publicRoutes = [
    "/",
    "/courses",
    "/batches",
    "/about",
    "/contact",
    "/faq",
    "/current-affairs",
    "/mock-tests",
    "/class-pdfs",
    "/exam-planner",
    "/mobile-app",
    "/privacy",
    "/terms",
    "/refund-policy",
    "/payment-policy",
    "/course-access-policy"
  ];

  return publicRoutes.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7
  }));
}
