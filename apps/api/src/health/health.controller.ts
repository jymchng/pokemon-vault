import { Controller, Get, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { HealthService } from "./health.service";

/**
 * Health endpoints (§63) — exempt from rate limiting (orchestrators ping
 * these far more than the default ceiling; they carry no sensitive data).
 *
 *   GET /api/v1/health        liveness (process up)
 *   GET /api/v1/health/live   liveness alias
 *   GET /api/v1/health/ready  readiness (DB + Redis) → 200 ok | 503 degraded
 */
@Controller("health")
@SkipThrottle()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  liveness() {
    return { status: "ok", service: "pokemon-vault-api" };
  }

  @Get("live")
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  async ready(@Res({ passthrough: true }) res: any) {
    const report = await this.health.checkReady();
    res.status(report.status === "ok" ? 200 : 503);
    return report;
  }
}
