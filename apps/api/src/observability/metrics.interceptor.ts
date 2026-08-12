import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { MetricsService } from "./metrics.service";

/**
 * HTTP metrics interceptor (§67): records request count, duration histogram,
 * and 5xx error count with labels method / route / status. The route label is
 * the route pattern (e.g. /api/v1/products/:id) when available, otherwise the
 * path — never query strings, bodies, or user identifiers (no PII).
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<{ method: string; route?: { path?: string }; originalUrl?: string; url?: string }>();
    const res = http.getResponse<{ statusCode: number }>();
    const method = req.method ?? "UNKNOWN";
    // Route label = the matched route pattern when available (already includes
    // the global /api/v1 prefix), else the request path — never query strings,
    // bodies, or user identifiers (no PII).
    const rawPath = (req.originalUrl ?? req.url ?? "/").replace(/\?.*$/, "");
    const route = req.route?.path ? req.route.path : rawPath;

    const start = process.hrtime.bigint();
    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Number(process.hrtime.bigint() - start) / 1e6;
          this.metrics.recordHttp(method, route, res.statusCode ?? 200, ms);
        },
        error: () => {
          const ms = Number(process.hrtime.bigint() - start) / 1e6;
          this.metrics.recordHttp(method, route, 500, ms);
        },
      }),
    );
  }
}
