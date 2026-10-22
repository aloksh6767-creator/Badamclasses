import { NextResponse } from "next/server";

export function middleware(request) {
  const pathname = request.nextUrl.pathname;

  const response = NextResponse.next();
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/instructor") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/wishlist") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/learn") ||
    pathname.startsWith("/live") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/results" ||
    pathname.startsWith("/ai-saas")
  ) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|robots.txt|sitemap.xml|manifest.webmanifest).*)"]
};
