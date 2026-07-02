import { NextResponse } from "next/server";
import { accessToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  const secret = process.env.ACCESS_CODE;
  // Protection not enabled — nothing to check.
  if (!secret) return NextResponse.json({ ok: true, open: true });

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
    maxAge: 60 * 60 * 24 * 30, // stay signed in for 30 days
  });
  return res;
}
