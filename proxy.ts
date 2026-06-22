import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

const AUTH_ROUTES = ["/login", "/signup", "/buyer-login"];
const ADMIN_PREFIX = "/admin";
const BUSINESS_PREFIX = "/business";
const ACCOUNT_PREFIX = "/account";

function homeFor(role: string | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "vendor") return "/business";
  if (role === "buyer") return "/account";
  return "/store";
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);

  const isAuthRoute = AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAdmin = pathname.startsWith(ADMIN_PREFIX);
  const isBusiness = pathname.startsWith(BUSINESS_PREFIX);
  const isAccount = pathname.startsWith(ACCOUNT_PREFIX);

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }

  // Buyers sign in at /buyer-login; sellers/admins at /login.
  if ((isAdmin || isBusiness) && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isAccount && !session) {
    return NextResponse.redirect(new URL("/buyer-login", req.url));
  }
  if (isAdmin && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isBusiness && session?.role !== "vendor") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isAccount && session?.role !== "buyer") {
    return NextResponse.redirect(new URL(homeFor(session?.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)"],
};
