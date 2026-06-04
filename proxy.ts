import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

const AUTH_ROUTES = ["/login", "/signup"];
const ADMIN_PREFIX = "/admin";
const BUSINESS_PREFIX = "/business";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);

  const isAuthRoute = AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAdmin = pathname.startsWith(ADMIN_PREFIX);
  const isBusiness = pathname.startsWith(BUSINESS_PREFIX);

  if (isAuthRoute && session) {
    const dest =
      session.role === "admin" ? "/admin" : session.role === "vendor" ? "/business" : "/store";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if ((isAdmin || isBusiness) && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isAdmin && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isBusiness && session?.role !== "vendor") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)"],
};
