import { NextResponse } from "next/server";
import { accessToken, authMode, COOKIE_NAME } from "@/lib/auth";

/** GET → tells the login page which mode is active. */
export async function GET() {
  return NextResponse.json({ mode: authMode() });
}

/** POST {code} → access-code mode login. */
export async function POST(req: Request) {
  if (authMode() !== "code") {
    return NextResponse.json({ ok: false, error: "Access-code login is not enabled." }, { status: 400 });
  }
  const secret = process.env.ACCESS_CODE!;
  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";

  if (code !== secret) {
    return NextResponse.json({ ok: false, error: "Incorrect access code." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, await accessToken(secret), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
