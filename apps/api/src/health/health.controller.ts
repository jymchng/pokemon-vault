import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { HealthService } from "./health.service";

/**
 * Liveness/readiness probes are exempt from rate limiting — orchestrators and
 * load balancers ping these far more often than the 60 req/min default, and
 * they carry no sensitive data.
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
  ready() {
    return this.health.checkReady();
  }
}
