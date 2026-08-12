/**
 * CORS allow-list (§54): the API only ever echoes credentials-enabled CORS
 * headers for origins listed in WEB_ORIGIN (comma-separated). Never `*` —
 * authenticated endpoints rely on cookies (HttpOnly) so a wildcard origin
 * plus credentials is rejected by browsers anyway, and an explicit allow-list
 * is required for credentialed cross-origin requests.
 */

export const DEFAULT_WEB_ORIGIN = "http://localhost:3000";

/**
 * Parse the WEB_ORIGIN env var into a CORS origin allow-list.
 * - Accepts a comma-separated list (whitespace trimmed, trailing slashes removed).
 * - Falls back to the local dev origin when unset/empty.
 * - Filters out empty segments and rejects a literal "*" so production can
 *   never silently become open to every origin.
 */
export function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw || raw.trim().length === 0) return [DEFAULT_WEB_ORIGIN];
  const origins = raw
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter((o) => o.length > 0 && o !== "*");
  return origins.length > 0 ? origins : [DEFAULT_WEB_ORIGIN];
}
