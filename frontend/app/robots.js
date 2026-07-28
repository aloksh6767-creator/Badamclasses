const siteUrl = "https://www.badamclasses.in";

export default function robots() {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/instructor",
        "/dashboard",
        "/profile",
        "/wishlist",
        "/checkout",
        "/learn/",
        "/live/",
        "/login",
        "/signup",
        "/forgot-password",
        "/results",
        "/ai-saas/",
        "/api/"
      ]
    }],
    sitemap: siteUrl + "/sitemap.xml"
  };
}
