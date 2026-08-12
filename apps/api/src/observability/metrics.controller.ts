import { Controller, Get, Header, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { MetricsService } from "./metrics.service";

/**
 * Prometheus scrape endpoint (§67): GET /metrics → text/plain exposition.
 * Prometheus scrapes frequently, so throttling is skipped. No auth — scrape
 * endpoints carry aggregate counters only (no user data).
 */
@Controller("metrics")
@SkipThrottle()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header("content-type", "text/plain; version=0.0.4; charset=utf-8")
  async scrape(@Res({ passthrough: true }) res: any) {
    res.set("X-Content-Type-Options", "nosniff");
    return this.metrics.metrics();
  }
}
