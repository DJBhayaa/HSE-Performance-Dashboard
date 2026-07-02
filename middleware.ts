// Access-code gate. When the ACCESS_CODE environment variable is set (in
// Vercel: Project → Settings → Environment Variables), every page AND the
// workbook file under /data require a valid auth cookie; visitors without one
// are redirected to /login. When ACCESS_CODE is not set the site stays open,
// so local development and first deploys keep working.

import { NextRequest, NextResponse } from "next/server";
import { accessToken, COOKIE_NAME } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const secret = process.env.ACCESS_CODE;
  if (!secret) return NextResponse.next(); // protection disabled

  const { pathname } = req.nextUrl;
  // The login page and the auth endpoint must stay reachable.
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie && cookie === (await accessToken(secret))) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Protect everything except Next.js build assets and the logo images
  // (logos are needed to render the login page itself). /data IS protected.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|logos/).*)"],
};
