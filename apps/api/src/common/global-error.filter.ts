import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ZodError } from "zod";
import { AppError } from "./app-error";
import { StructuredLogger } from "./structured-logger";
import { captureError } from "../observability/sentry";

/** Stable machine-readable error codes (§102) for common cases. */
const CODE_BY_STATUS: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_ERROR",
  503: "SERVICE_UNAVAILABLE",
};

/**
 * Global error filter (§50): every error becomes
 *   { error: { code, message, details? } }
 * - Never exposes stack traces, SQL errors, secrets, or filesystem paths —
 *   in production the internal message is replaced with a generic one.
 * - ZodError → 400 with field issues.
 * - Unknown exceptions → 500 INTERNAL_ERROR.
 */
@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  private readonly logger: StructuredLogger;

  constructor(correlation?: import("./correlation.service").CorrelationService) {
    this.logger = new StructuredLogger("api", correlation);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const req = ctx.getRequest<{ url?: string; method?: string; requestId?: string }>();

    const isProd = process.env.NODE_ENV === "production";
    const requestId = (req as any)?.requestId ?? undefined;

    // Zod validation → 400 with field-level issues.
    if (exception instanceof ZodError) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: exception.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      });
    }

    // Centralized AppError → stable machine-readable code (§102).
    if (exception instanceof AppError) {
      const status = exception.getStatus();
      this.logger.warn(`${req.method} ${req.url} -> ${status} (${requestId ?? "?"}) [${exception.code}]`);
      return res.status(status).json({
        error: {
          code: exception.code,
          message: exception.message,
          ...(exception.details ? { details: exception.details } : {}),
        },
      });
    }

    // Nest/App HTTP exceptions (including our NotFound/Conflict/Forbidden...).
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === "string"
          ? body
          : (body as { message?: string | string[] })?.message ?? exception.message;
      this.logger.warn(`${req.method} ${req.url} -> ${status} (${requestId ?? "?"})`);
      return res.status(status).json({
        error: {
          code: CODE_BY_STATUS[status] ?? `HTTP_${status}`,
          message: Array.isArray(message) ? message.join("; ") : String(message),
        },
      });
    }

    // Everything else (SQL errors, unexpected): 500, sanitized in prod.
    const err = exception as Error;
    this.logger.error(
      `Unhandled ${req.method} ${req.url} (${requestId ?? "?"}): ${err?.message ?? exception}`,
      err?.stack,
    );
    // §69: report unhandled server errors to Sentry (no-op without SENTRY_DSN).
    captureError(exception, { requestId, userId: (req as any)?.user?.id });
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: "INTERNAL_ERROR",
        message: isProd
          ? "An unexpected error occurred"
          : err?.message ?? "Unknown error",
      },
    });
  }
}
