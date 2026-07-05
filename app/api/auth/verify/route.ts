import { NextResponse } from "next/server";
import {
  authMode,
  domainAllowed,
  encodeSession,
  normalizeEmail,
  otpFor,
  sessionSig,
  COOKIE_NAME,
  OTP_WINDOW_MS,
} from "@/lib/auth";

/** POST {email, otp} → verify the code and start a 30-day session. */
export async function POST(req: Request) {
  if (authMode() !== "otp") {
    return NextResponse.json({ ok: false, error: "Email login is not enabled." }, { status: 400 });
  }
  const secret = process.env.AUTH_SECRET!;

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
  const otp = String(typeof body.otp === "string" || typeof body.otp === "number" ? body.otp : "").trim();

  if (!email || !/^\d{6}$/.test(otp)) {
    return NextResponse.json({ ok: false, error: "Enter the 6-digit code from your email." }, { status: 400 });
  }
  if (!domainAllowed(email, process.env.ALLOWED_EMAIL_DOMAINS)) {
    return NextResponse.json({ ok: false, error: "This email domain isn't authorised." }, { status: 403 });
  }

  // Accept the current and previous 5-minute windows (~10 minutes of validity).
  const window = Math.floor(Date.now() / OTP_WINDOW_MS);
  const valid = otp === (await otpFor(secret, email, window)) || otp === (await otpFor(secret, email, window - 1));

  if (!valid) {
    return NextResponse.json({ ok: false, error: "Incorrect or expired code. Request a new one." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, encodeSession(email, await sessionSig(secret, email)), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // stay signed in for 30 days
  });
  return res;
}
