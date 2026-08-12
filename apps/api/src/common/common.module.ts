import { Global, Module, MiddlewareConsumer } from "@nestjs/common";
import { RequestIdMiddleware } from "./request-id.middleware";
import { CorrelationService } from "./correlation.service";
import { StructuredLogger } from "./structured-logger";
import { IdempotencyService } from "./idempotency.service";
import { AbuseProtectionService } from "./abuse-protection.service";
import { CacheService } from "./cache.service";

/**
 * Global cross-cutting concerns (§65-66): request correlation (request_id +
 * user_id via AsyncLocalStorage) and structured JSON logging. Global so every
 * module can inject CorrelationService / StructuredLogger; the request-id
 * middleware runs for all routes.
 */
@Global()
@Module({
  providers: [
    CorrelationService,
    IdempotencyService,
    AbuseProtectionService,
    CacheService,
    {
      provide: StructuredLogger,
      // Factory injection — the constructor's service-name string must not be
      // treated as an injectable dependency by Nest.
      useFactory: (correlation: CorrelationService) =>
        new StructuredLogger("api", correlation),
      inject: [CorrelationService],
    },
  ],
  exports: [CorrelationService, StructuredLogger, IdempotencyService, AbuseProtectionService, CacheService],
})
export class CommonModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
