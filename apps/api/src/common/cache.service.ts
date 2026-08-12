import { Injectable, OnModuleDestroy } from "@nestjs/common";
import IORedis from "ioredis";
import { buildRedisConnection } from "../queue/queue.service";

/**
 * Redis cache (§94): sessions, rate-limits, hot products, search suggestions,
 * and inventory reservations — with TTLs and explicit invalidation. All keys
 * are namespaced `pv:<scope>:<key>`; values are JSON. Failures are swallowed
 * (cache is an optimization, never a source of truth).
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly redis: IORedis;

  constructor() {
    this.redis = buildRedisConnection();
  }

  private key(scope: string, key: string): string {
    return `pv:${scope}:${key}`;
  }

  /** Get a cached JSON value; null on miss or error. */
  async get<T>(scope: string, key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(this.key(scope, key));
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  /** Set a JSON value with a TTL (seconds). */
  async set<T>(scope: string, key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(this.key(scope, key), JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      // ignore
    }
  }

  /** Delete one key (invalidation). */
  async del(scope: string, key: string): Promise<void> {
    try {
      await this.redis.del(this.key(scope, key));
    } catch {
      // ignore
    }
  }

  /** Delete all keys for a scope prefix (e.g. invalidate hot-products on restock). */
  async delScope(scope: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`pv:${scope}:*`);
      if (keys.length) await this.redis.del(...keys);
    } catch {
      // ignore
    }
  }

  /** Atomic increment with expiry — rate-limit counters (§52/§94). */
  async incr(scope: string, key: string, ttlSeconds: number): Promise<number> {
    try {
      const k = this.key(scope, key);
      const n = await this.redis.incr(k);
      if (n === 1) await this.redis.expire(k, ttlSeconds);
      return n;
    } catch {
      return 0;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
