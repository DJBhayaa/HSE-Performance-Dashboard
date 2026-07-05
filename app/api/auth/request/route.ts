import { NextResponse } from "next/server";
import { authMode, domainAllowed, normalizeEmail, otpFor, OTP_WINDOW_MS } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Send the 6-digit code via Resend or Brevo (both are a single API call). */
async function sendOtpEmail(to: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  const subject = `${otp} is your H&S Dashboard code`;
  const text = `Your one-time code for the QTC JV H&S Performance Dashboard is: ${otp}\n\nIt is valid for about 10 minutes. If you didn't request this, you can ignore this email.`;
  const from = process.env.OTP_FROM_EMAIL;

  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: from ?? "onboarding@resend.dev", to: [to], subject, text }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `Email service error (${res.status}).` };
  }

  if (process.env.BREVO_API_KEY) {
    if (!from) return { ok: false, error: "OTP_FROM_EMAIL is not configured." };
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": process.env.BREVO_API_KEY },
      body: JSON.stringify({
        sender: { email: from, name: "QTC JV H&S Dashboard" },
        to: [{ email: to }],
        subject,
        textContent: text,
      }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `Email service error (${res.status}).` };
  }

  return { ok: false, error: "No email provider is configured (set RESEND_API_KEY or BREVO_API_KEY)." };
}

/** POST {email} → email a one-time code to an approved company address. */
export async function POST(req: Request) {
  if (authMode() !== "otp") {
    return NextResponse.json({ ok: false, error: "Email login is not enabled." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(typeof body.email === "string" ? body.email : "");

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!domainAllowed(email, process.env.ALLOWED_EMAIL_DOMAINS)) {
    return NextResponse.json(
      { ok: false, error: "This email domain isn't authorised. Please use your company email address." },
      { status: 403 }
    );
  }

  const window = Math.floor(Date.now() / OTP_WINDOW_MS);
  const otp = await otpFor(process.env.AUTH_SECRET!, email, window);

  // Local-testing escape hatch: with OTP_DEV_ECHO=1 and no provider configured,
  // the code is returned instead of emailed. Never set this in production.
  if (process.env.OTP_DEV_ECHO === "1" && !process.env.RESEND_API_KEY && !process.env.BREVO_API_KEY) {
    return NextResponse.json({ ok: true, devOtp: otp });
  }

  const sent = await sendOtpEmail(email, otp);
  if (!sent.ok) {
    return NextResponse.json({ ok: false, error: sent.error ?? "Could not send the email." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
