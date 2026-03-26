import { MAINTENANCE_COOKIE_NAME, verifyMaintenanceToken } from "@/lib/maintenance-token";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE !== "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (/\.(ico|png|jpg|jpeg|gif|webp|svg|woff2?|txt|xml|webmanifest)$/i.test(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }
  if (pathname === "/favicon.ico") {
    return NextResponse.next();
  }
  if (pathname === "/maintenance") {
    return NextResponse.next();
  }
  if (pathname === "/api/maintenance-unlock") {
    return NextResponse.next();
  }

  const raw = request.cookies.get(MAINTENANCE_COOKIE_NAME)?.value;
  if (await verifyMaintenanceToken(raw)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/maintenance";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.ico$|.*\\.svg$).*)",
  ],
};
