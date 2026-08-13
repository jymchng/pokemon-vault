import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import IORedis from "ioredis";
import { loadConfig } from "@pokemon-vault/config";

/**
 * Global default rate limit (§52) — sourced from config/app.toml [security]
 * (overridable via POKE_VAULT_GLOBAL_RATE_LIMIT / POKE_VAULT_GLOBAL_RATE_TTL_MS),
 * default 60 requests per IP per 60s window. Sensitive endpoints override this
 * with tighter per-endpoint @Throttle limits
 * (login/register/password-reset/checkout/payment/pack-opening),
 * so brute-force / abuse is capped well below the aggregate ceiling.
 * Exceeding a limit yields HTTP 429 TOO_MANY_REQUESTS via the global
 * error envelope ({ error: { code: "TOO_MANY_REQUESTS", ... } }).
 */

/**
 * Redis-backed storage (ThrottlerStorageRedisService) so limits hold
 * across multiple API instances behind a load balancer. The storage
 * package's peerDependencies match @nestjs/throttler v6 and ioredis v6.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        let cfg: ReturnType<typeof loadConfig> | null = null;
        try {
          cfg = loadConfig(process.env);
        } catch {
          cfg = null;
        }
        const limit = cfg?.security.globalRateLimit ?? 60;
        const ttl = cfg?.security.globalRateTtlMs ?? 60_000;
        const connection = new IORedis(
          process.env.POKE_VAULT_REDIS_URL || "redis://localhost:6379",
          { maxRetriesPerRequest: null },
        );
        return {
          throttlers: [{ name: "default", ttl, limit }],
          storage: new ThrottlerStorageRedisService(connection),
          errorMessage: "Too Many Requests",
        };
      },
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class SecurityModule {}
