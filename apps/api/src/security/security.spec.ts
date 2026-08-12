import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { ThrottlerException, ThrottlerGuard } from "@nestjs/throttler";
import { DEFAULT_RATE_LIMIT, DEFAULT_RATE_TTL_MS } from "./security.module";
import {
  DEFAULT_WEB_ORIGIN,
  parseCorsOrigins,
} from "./cors";

describe("parseCorsOrigins (§54)", () => {
  it("falls back to the local dev origin when WEB_ORIGIN is unset/empty", () => {
    expect(parseCorsOrigins(undefined)).toEqual([DEFAULT_WEB_ORIGIN]);
    expect(parseCorsOrigins("")).toEqual([DEFAULT_WEB_ORIGIN]);
    expect(parseCorsOrigins("   ")).toEqual([DEFAULT_WEB_ORIGIN]);
  });

  it("parses a comma-separated allow-list, trimming whitespace and trailing slashes", () => {
    expect(
      parseCorsOrigins("https://app.pokemon-vault.dev, https://staging.pokemon-vault.dev/ "),
    ).toEqual([
      "https://app.pokemon-vault.dev",
      "https://staging.pokemon-vault.dev",
    ]);
  });

  it("never allows a wildcard origin", () => {
    expect(parseCorsOrigins("*")).toEqual([DEFAULT_WEB_ORIGIN]);
    expect(parseCorsOrigins("https://app.pokemon-vault.dev, *")).toEqual([
      "https://app.pokemon-vault.dev",
    ]);
  });

  it("drops empty segments", () => {
    expect(parseCorsOrigins("https://a.dev, , https://b.dev")).toEqual([
      "https://a.dev",
      "https://b.dev",
    ]);
  });
});

describe("ThrottlerGuard (§52)", () => {
  /** In-memory stand-in for ThrottlerStorageRedisService semantics. */
  class FakeStorage {
    hits = new Map<string, number>();
    async increment(
      key: string,
      ttl: number,
      limit: number,
      blockDuration: number,
      _name: string,
    ) {
      const totalHits = (this.hits.get(key) ?? 0) + 1;
      this.hits.set(key, totalHits);
      return {
        totalHits,
        timeToExpire: ttl,
        isBlocked: totalHits > limit,
        timeToBlockExpire: blockDuration,
      };
    }
  }

  function makeContext(handler: (...args: any[]) => unknown, ctor: unknown) {
    const req: any = { ip: "203.0.113.7", headers: {} };
    const res = { header: vi.fn() };
    const context: any = {
      getHandler: () => handler,
      getClass: () => ctor,
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    };
    return { context, req, res };
  }

  async function makeGuard(storage = new FakeStorage()) {
    const guard = new ThrottlerGuard(
      {
        throttlers: [
          { name: "default", ttl: DEFAULT_RATE_TTL_MS, limit: DEFAULT_RATE_LIMIT },
        ],
      } as any,
      storage as any,
      new Reflector(),
    );
    await guard.onModuleInit();
    return guard;
  }

  it("enforces the global default limit and throws 429 ThrottlerException after it", async () => {
    const storage = new FakeStorage();
    const guard = await makeGuard(storage);
    const { context } = makeContext(async () => "ok", class FakeDefaultController {});

    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ThrottlerException);
    let err: unknown;
    try {
      await guard.canActivate(context);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ThrottlerException);
    expect((err as ThrottlerException).getStatus()).toBe(429);
  });

  it("applies tighter per-endpoint @Throttle limits (metadata override)", async () => {
    class FakeSensitiveController {
      // Mirrors the real @Throttle({ default: { limit: 5, ttl: 60_000 } })
      // on auth/login — verifies the decorator actually caps the bucket.
      // (Metadata is attached programmatically below via Reflect.defineMetadata.)
      async login() {
        return "ok";
      }
    }
    // Replicate what @nestjs/throttler's @Throttle decorator stores.
    Reflect.defineMetadata("THROTTLER:LIMITdefault", 5, FakeSensitiveController.prototype.login);
    Reflect.defineMetadata("THROTTLER:TTLdefault", 60_000, FakeSensitiveController.prototype.login);

    const storage = new FakeStorage();
    const guard = await makeGuard(storage);
    const { context } = makeContext(
      FakeSensitiveController.prototype.login,
      FakeSensitiveController,
    );

    for (let i = 0; i < 5; i++) {
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ThrottlerException);
  });

  it("skips throttling for health probes (@SkipThrottle)", async () => {
    class FakeHealthController {}
    Reflect.defineMetadata("THROTTLER:SKIPdefault", true, FakeHealthController);

    const storage = new FakeStorage();
    const guard = await makeGuard(storage);
    const { context } = makeContext(async () => "ok", FakeHealthController);

    // Any number of calls passes — no counters touched.
    for (let i = 0; i < 10; i++) {
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }
    expect(storage.hits.size).toBe(0);
  });

  it("keys buckets per client IP (getTracker → req.ip)", async () => {
    const storage = new FakeStorage();
    const guard = await makeGuard(storage);

    const reqA: any = { ip: "203.0.113.7", headers: {} };
    const reqB: any = { ip: "198.51.100.4", headers: {} };
    const res = { header: vi.fn() };
    const mk = (req: any) => ({
      getHandler: () => async () => "ok",
      getClass: () => class PerIpController {},
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    });

    for (let i = 0; i < DEFAULT_RATE_LIMIT; i++) {
      await expect(guard.canActivate(mk(reqA) as any)).resolves.toBe(true);
    }
    // Different IP still has a full bucket.
    await expect(guard.canActivate(mk(reqB) as any)).resolves.toBe(true);
    // First IP is now over the limit.
    await expect(guard.canActivate(mk(reqA) as any)).rejects.toBeInstanceOf(ThrottlerException);
  });
});
