import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { QueueModule } from "../queue/queue.module";
import { MetricsService } from "./metrics.service";
import { MetricsInterceptor } from "./metrics.interceptor";
import { MetricsController } from "./metrics.controller";

/**
 * Observability (§67-69): Prometheus metrics (HTTP/DB/Redis/queues/domain +
 * business), HTTP metrics interceptor, and the /metrics scrape endpoint.
 * Tracing (OTel) and Sentry are initialized in main.ts (lazy, env-gated).
 */
@Global()
@Module({
  imports: [QueueModule],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [MetricsService],
})
export class ObservabilityModule {}
