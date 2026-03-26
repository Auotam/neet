/** HMAC cookie for maintenance bypass (Edge-safe). */

const SALT = "neet-maintenance-cookie-v1";

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function hexFromBuf(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function maintenanceCookieSecret(): string | undefined {
  const explicit = process.env.MAINTENANCE_COOKIE_SECRET;
  const pass = process.env.MAINTENANCE_PASSWORD;
  if (explicit?.trim()) return explicit.trim();
  if (pass?.trim()) return `${pass.trim()}:${SALT}`;
  return undefined;
}

export async function createMaintenanceToken(): Promise<string | null> {
  const secret = maintenanceCookieSecret();
  if (!secret) return null;
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const expStr = String(exp);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(expStr),
  );
  return `${expStr}:${hexFromBuf(sig)}`;
}

export async function verifyMaintenanceToken(
  token: string | undefined,
): Promise<boolean> {
  const secret = maintenanceCookieSecret();
  if (!token || !secret) return false;
  const colon = token.indexOf(":");
  if (colon === -1) return false;
  const expStr = token.slice(0, colon);
  const sigHex = token.slice(colon + 1);
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(expStr),
  );
  const expectedHex = hexFromBuf(sig);
  return timingSafeEqualHex(sigHex.toLowerCase(), expectedHex.toLowerCase());
}

export const MAINTENANCE_COOKIE_NAME = "neet_maintenance";
