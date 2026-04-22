import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const mode = process.env.APP_MODE ?? "public";
  const { pathname } = request.nextUrl;

  if (mode === "public") {
    // Block admin UI and auth routes entirely
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/auth")) {
      return new NextResponse(null, { status: 404 });
    }
    // Block all write operations on photo/volume APIs
    if (
      request.method !== "GET" &&
      (pathname.startsWith("/api/photos") || pathname.startsWith("/api/volumes"))
    ) {
      return new NextResponse(null, { status: 404 });
    }
  }

  if (mode === "admin") {
    // Redirect all non-admin, non-API paths to /admin
    if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internals, static assets, and served photos
  matcher: ["/((?!_next/|photos/|favicon).*)"],
};
