// Access gate. Mode is chosen by environment variables (HOW-TO-DEPLOY.md):
//   AUTH_SECRET set            → email-OTP mode (company emails only)
//   ACCESS_CODE set (no OTP)   → shared access-code mode
//   neither                    → site open (local dev / first deploy)
// Every page AND the workbook under /data require a valid session cookie;
// visitors without one are redirected to /login.

import { NextRequest, NextResponse } from "next/server";
import { accessToken, authMode, decodeSession, sessionSig, COOKIE_NAME } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const mode = authMode();
  if (mode === "open") return NextResponse.next();

  const { pathname } = req.nextUrl;
  // The login page and auth endpoints must stay reachable.
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie) {
    if (mode === "code" && cookie === (await accessToken(process.env.ACCESS_CODE!))) {
      return NextResponse.next();
    }
    if (mode === "otp") {
      const session = decodeSession(cookie);
      if (session && session.sig === (await sessionSig(process.env.AUTH_SECRET!, session.email))) {
        return NextResponse.next();
      }
    }
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
