/**
 * Minimal cookie helpers (no cookie-parser dependency).
 * Cookies are set as HttpOnly + Secure + SameSite=Lax on the Express response
 * and parsed from the raw `Cookie` request header.
 */

export const ACCESS_COOKIE = "pv_access";
export const REFRESH_COOKIE = "pv_refresh";

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number; // milliseconds
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

/**
 * Set a cookie on the Express response. `res` is loosely typed because
 * @types/express is not installed; express 5 exposes res.cookie natively.
 */
export function setCookie(
  res: any,
  name: string,
  value: string,
  opts: CookieOptions,
): void {
  res.cookie(name, value, {
    httpOnly: opts.httpOnly ?? true,
    secure: opts.secure ?? false,
    sameSite: opts.sameSite ?? "lax",
    path: opts.path ?? "/",
    maxAge: opts.maxAge,
  });
}

export function clearCookie(res: any, name: string): void {
  res.clearCookie(name, { path: "/", httpOnly: true, sameSite: "lax" });
}
