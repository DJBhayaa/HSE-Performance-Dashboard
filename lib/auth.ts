// Auth helpers for the access gate. Everything uses Web Crypto so the same
// code runs in the Edge middleware and the Node route handlers.
//
// Two modes, chosen by environment variables (see HOW-TO-DEPLOY.md):
//   • Email OTP mode — set AUTH_SECRET (+ ALLOWED_EMAIL_DOMAINS and an email
//     provider key). Users enter their company email, receive a 6-digit
//     one-time code, and get a 30-day session cookie tied to their email.
//   • Access-code mode — set ACCESS_CODE only. One shared code for everyone.
//   • Neither set — the site is open (local dev / first deploy).
//
// The OTP is STATELESS: it is an HMAC of (email + 5-minute time window), so no
// database is needed — the verify endpoint just recomputes it. Codes stay
// valid for the current and previous window (≈5–10 minutes).

const COOKIE_NAME = "qtc_access";
export { COOKIE_NAME };

export const OTP_WINDOW_MS = 5 * 60 * 1000;

export type AuthMode = "otp" | "code" | "open";

export function authMode(): AuthMode {
  if (process.env.AUTH_SECRET) return "otp";
  if (process.env.ACCESS_CODE) return "code";
  return "open";
}

const enc = new TextEncoder();

const hex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** ── Access-code mode ─────────────────────────────────────────────────────── */
export async function accessToken(secret: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(`qtc-hse-dashboard|v1|${secret}`)));
}

/** ── Email-OTP mode ───────────────────────────────────────────────────────── */
export async function otpFor(secret: string, email: string, window: number): Promise<string> {
  const h = await hmac(secret, `otp|${normalizeEmail(email)}|${window}`);
  return String(parseInt(h.slice(0, 12), 16) % 1_000_000).padStart(6, "0");
}

export async function sessionSig(secret: string, email: string): Promise<string> {
  return hmac(secret, `session|v1|${normalizeEmail(email)}`);
}

export function encodeSession(email: string, sig: string): string {
  return `${encodeURIComponent(normalizeEmail(email))}.${sig}`;
}

export function decodeSession(token: string): { email: string; sig: string } | null {
  const i = token.lastIndexOf(".");
  if (i < 1) return null;
  try {
    return { email: decodeURIComponent(token.slice(0, i)), sig: token.slice(i + 1) };
  } catch {
    return null;
  }
}

/** Comma-separated ALLOWED_EMAIL_DOMAINS → is this email's domain approved? */
export function domainAllowed(email: string, allowedCsv: string | undefined): boolean {
  const domain = normalizeEmail(email).split("@")[1];
  if (!domain) return false;
  const allowed = (allowedCsv ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  return allowed.length > 0 && allowed.includes(domain);
}
