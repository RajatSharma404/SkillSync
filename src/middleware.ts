import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Pages that require authentication
const PROTECTED_PAGES = [
  "/dashboard",
  "/analytics",
  "/log",
  "/reports",
  "/insights",
  "/settings",
];

// API route prefixes that require authentication
const PROTECTED_API_PREFIXES = [
  "/api/activities",
  "/api/analytics",
  "/api/domains",
  "/api/goals",
  "/api/insights",
  "/api/query",
  "/api/weekly-report",
  "/api/export",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtectedPage = PROTECTED_PAGES.some((p) => pathname.startsWith(p));
  const isProtectedApi = PROTECTED_API_PREFIXES.some((p) =>
    pathname.startsWith(p),
  );

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     * - /api/auth (NextAuth routes must stay open)
     * - /api/seed (seeding endpoint)
     * - /login page itself
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|api/auth|api/seed|login).*)",
  ],
};
