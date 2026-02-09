import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const PRO_ROLES = ["PHOTOGRAPHER", "ORGANIZER", "AGENCY", "CLUB", "FEDERATION"];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as string | undefined;

    // Admin routes: ADMIN only
    if (pathname.startsWith("/admin")) {
      if (role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Photographer/Pro routes: Pro roles only
    if (pathname.startsWith("/photographer")) {
      if (!role || !PRO_ROLES.includes(role)) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Admin API routes: ADMIN only
    if (pathname.startsWith("/api/admin")) {
      if (role !== "ADMIN") {
        return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/photographer/:path*",
    "/api/admin/:path*",
    "/account/:path*",
  ],
};
