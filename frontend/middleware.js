import { NextResponse } from "next/server";

export function middleware() {
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/instructor/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/wishlist/:path*",
    "/checkout/:path*",
    "/learn/:path*",
    "/live/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/results",
    "/ai-saas/:path*"
  ]
};
