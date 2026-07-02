// Shared helper for the access-code gate. The cookie stores a SHA-256 digest
// of the access code (never the code itself), computed with Web Crypto so the
// same code runs in both the Edge middleware and the Node route handler.

const COOKIE_NAME = "qtc_access";

export { COOKIE_NAME };

export async function accessToken(secret: string): Promise<string> {
  const data = new TextEncoder().encode(`qtc-hse-dashboard|v1|${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
