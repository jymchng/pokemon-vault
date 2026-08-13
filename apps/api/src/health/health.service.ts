import { Injectable, OnModuleDestroy, Optional } from "@nestjs/common";
import IORedis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";

export type ProbeStatus = "ok" | "error";

export interface ReadinessProbes {
  db?: () => Promise<ProbeStatus>;
  redis?: () => Promise<ProbeStatus>;
}

export interface ReadinessReport {
  status: "ok" | "degraded";
  checks: { db: ProbeStatus; redis: ProbeStatus };
}

/**
 * Health checks (§63): liveness = process is up; readiness = critical
 * dependencies (Postgres + Redis) are actually reachable.
 *
 * Readiness NEVER leaks internals: check values are only "ok" | "error" —
 * no connection strings, hosts, versions, or error messages are exposed, so
 * an attacker or probe cannot fingerprint the infrastructure from /ready.
 */
@Injectable()
export class HealthService implements OnModuleDestroy {
  private redis: IORedis;

  constructor(
    private readonly prisma: PrismaService,
    /** Optional probe overrides (unit tests); defaults probe the real deps. */
    @Optional() private readonly probes: ReadinessProbes = {},
  ) {
    // Lazy + fail-fast: no TCP connection until the first probe; a dead Redis
    // answers "error" in ~1s (connectTimeout) instead of hanging on ioredis's
    // default 10s retry, and the client is recreated after a failure so a
    // recovered Redis is detected on the next probe.
    this.redis = this.buildRedisClient();
  }

  private buildRedisClient(): IORedis {
    return new IORedis(process.env.POKE_VAULT_REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 1000,
      retryStrategy: () => null as any, // no reconnect storm; probe recreates
    });
  }

  async checkReady(): Promise<ReadinessReport> {
    const db = this.probes.db ? await this.probes.db() : await this.probeDb();
    const redis = this.probes.redis ? await this.probes.redis() : await this.probeRedis();
    return {
      status: db === "ok" && redis === "ok" ? "ok" : "degraded",
      checks: { db, redis },
    };
  }

  private async probeDb(): Promise<ProbeStatus> {
    try {
      await this.prisma.$queryRawUnsafe("SELECT 1");
      return "ok";
    } catch {
      return "error";
    }
  }

  private async probeRedis(): Promise<ProbeStatus> {
    try {
      if (this.redis.status === "end") {
        // Previous probe hit a dead Redis; recreate so a recovered instance is
        // picked up on the next readiness call.
        this.redis = this.buildRedisClient();
      }
      return (await this.redis.ping()) === "PONG" ? "ok" : "error";
    } catch {
      return "error";
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
