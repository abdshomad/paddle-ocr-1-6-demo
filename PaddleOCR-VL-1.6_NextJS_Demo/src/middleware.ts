import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session_token")?.value;
  const { pathname } = request.nextUrl;

  // Define paths that are accessible without authentication
  const isAuthPage = pathname === "/signin";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon.ico");

  if (isStaticAsset || isApiAuth) {
    return NextResponse.next();
  }

  // If not authenticated and trying to access main app pages, redirect to /signin
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  // If authenticated and trying to access /signin, redirect to main page /
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
