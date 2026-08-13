import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import IORedis from "ioredis";

/**
 * Global default rate limit (§52): 60 requests per IP per 60s window.
 * Sensitive endpoints override this with tighter per-endpoint @Throttle
 * limits (login/register/password-reset/checkout/payment/pack-opening),
 * so brute-force / abuse is capped well below the aggregate ceiling.
 * Exceeding a limit yields HTTP 429 TOO_MANY_REQUESTS via the global
 * error envelope ({ error: { code: "TOO_MANY_REQUESTS", ... } }).
 */
export const DEFAULT_RATE_LIMIT = 60;
export const DEFAULT_RATE_TTL_MS = 60_000;

/**
 * Redis-backed storage (ThrottlerStorageRedisService) so limits hold
 * across multiple API instances behind a load balancer. The storage
 * package's peerDependencies match @nestjs/throttler v6 and ioredis v6.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const connection = new IORedis(
          process.env.POKE_VAULT_REDIS_URL || "redis://localhost:6379",
          { maxRetriesPerRequest: null },
        );
        return {
          throttlers: [{ name: "default", ttl: DEFAULT_RATE_TTL_MS, limit: DEFAULT_RATE_LIMIT }],
          storage: new ThrottlerStorageRedisService(connection),
          errorMessage: "Too Many Requests",
        };
      },
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class SecurityModule {}
