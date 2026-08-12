/**
 * Dependency-free token primitives (node:crypto).
 * - JWT (HS256) for short-lived access tokens.
 * - Opaque random tokens for refresh + one-time (email verify / password reset);
 *   only their SHA-256 hashes are stored at rest.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** 256-bit opaque token (43 base64url chars). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

interface JwtClaims {
  [key: string]: unknown;
  iat?: number;
  exp?: number;
}

/** Sign a HS256 JWT. Payload is shallow-copied; iat/exp are appended. */
export function signJwt(
  payload: JwtClaims,
  secret: string,
  expiresInSeconds: number,
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body: JwtClaims = { ...payload, iat: now, exp: now + expiresInSeconds };
  const head = b64url(JSON.stringify(header));
  const claims = b64url(JSON.stringify(body));
  const sig = createHmac("sha256", secret)
    .update(`${head}.${claims}`)
    .digest("base64url");
  return `${head}.${claims}.${sig}`;
}

/** Verify + decode a HS256 JWT. Returns null on any tamper/expiry. */
export function verifyJwt<T extends Record<string, unknown>>(
  token: string,
  secret: string,
): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, claims, sig] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${head}.${claims}`)
    .digest("base64url");
  const actual = Buffer.from(sig);
  const want = Buffer.from(expected);
  if (actual.length !== want.length || !timingSafeEqual(actual, want)) {
    return null;
  }
  try {
    const decoded = JSON.parse(
      Buffer.from(claims, "base64url").toString("utf8"),
    ) as T;
    if (
      typeof decoded.exp !== "number" ||
      decoded.exp * 1000 < Date.now()
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
