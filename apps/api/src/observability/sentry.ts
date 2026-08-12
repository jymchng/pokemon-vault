/**
 * Sentry error tracking (§69) — lazy + optional. Initialized only when
 * SENTRY_DSN is set. The global error filter calls captureError() so unhandled
 * and handled errors are reported to Sentry with the request_id / user_id
 * context; release from git SHA via SENTRY_RELEASE.
 *
 * Requires (prod only): pnpm --filter @pokemon-vault/api add @sentry/node
 * (see apps/api/src/observability/sentry.d.ts for the ambient declaration).
 */
export interface SentryInit {
  started: boolean;
}

let enabled = false;

export function initSentry(): SentryInit {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return { started: false };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Sentry = require("@sentry/node");
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: 0.1,
  });
  enabled = true;
  console.log("[sentry] error tracking enabled");
  return { started: true };
}

/**
 * Report an error to Sentry (no-op when disabled). Never throws. request_id /
 * user_id are attached for traceability; the error message is redacted by the
 * caller's structured logging path — Sentry receives only the exception.
 */
export function captureError(
  err: unknown,
  context?: { requestId?: string | null; userId?: string | null },
): void {
  if (!enabled) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require("@sentry/node");
    Sentry.withScope((scope: any) => {
      if (context?.requestId) scope.setTag("request_id", context.requestId);
      if (context?.userId) scope.setUser({ id: context.userId });
      Sentry.captureException(err);
    });
  } catch {
    // never let observability break the request
  }
}
