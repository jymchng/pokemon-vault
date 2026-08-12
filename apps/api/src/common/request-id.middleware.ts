import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { CorrelationService } from "./correlation.service";
import { StructuredLogger } from "./structured-logger";

/**
 * Correlation middleware (§66): every request gets a requestId — an incoming
 * `x-request-id` is honored (so an edge/API gateway can trace through us),
 * otherwise a short UUID is generated. The id is echoed back in the
 * `x-request-id` response header and seeded into the AsyncLocalStorage
 * correlation context, which the structured logger reads for every log line
 * and which queue producers attach to jobs. A request log line (method, url,
 * status, duration) is emitted on response finish with the same context.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(
    private readonly correlation: CorrelationService,
    private readonly logger: StructuredLogger,
  ) {}

  use(req: any, res: any, next: () => void) {
    const incoming = typeof req.headers?.["x-request-id"] === "string" ? req.headers["x-request-id"] : "";
    const requestId = (incoming || randomUUID().slice(0, 12)).slice(0, 64);
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    // Capture + re-enter the correlation context in the async 'finish'
    // callback (plain EventEmitter does not propagate ALS to listeners), so
    // the request log line always carries request_id / user_id.
    this.correlation.run({ requestId, userId: null }, () => {
      const start = process.hrtime.bigint();
      const ctx = this.correlation.get();
      res.on("finish", () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        this.correlation.run(ctx, () => {
          this.logger.log(
            `${req.method} ${req.originalUrl ?? req.url} ${res.statusCode} ${ms.toFixed(1)}ms`,
            "http",
          );
        });
      });
      next();
    });
  }
}
