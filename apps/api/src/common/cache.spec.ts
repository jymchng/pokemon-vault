import { describe, expect, it, vi } from "vitest";
import { CacheService } from "./cache.service";

/** Fake ioredis exposing the surface CacheService uses. */
class FakeRedis {
  store = new Map<string, string>();
  ttl = new Map<string, number>();
  get = vi.fn(async (k: string) => this.store.get(k) ?? null);
  set = vi.fn(async (k: string, v: string, _ex: string, ttl: number) => {
    this.store.set(k, v);
    this.ttl.set(k, ttl);
    return "OK";
  });
  del = vi.fn(async (...ks: string[]) => {
    let n = 0;
    for (const k of ks) if (this.store.delete(k)) n++;
    return n;
  });
  keys = vi.fn(async (pattern: string) => {
    const re = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return [...this.store.keys()].filter((k) => re.test(k));
  });
  incr = vi.fn(async (k: string) => {
    const n = Number(this.store.get(k) ?? 0) + 1;
    this.store.set(k, String(n));
    return n;
  });
  expire = vi.fn(async () => 1);
  quit = vi.fn(async () => "OK");
}

describe("cache (§94)", () => {
  it("set/get round-trips JSON with TTL and namespaces keys", async () => {
    const redis = new FakeRedis();
    const svc = new CacheService();
    (svc as any).redis = redis;
    await svc.set("hot-products", "k1", { items: [1, 2] }, 60);
    expect(redis.set.mock.calls[0][0]).toBe("pv:hot-products:k1");
    expect(redis.ttl.get("pv:hot-products:k1")).toBe(60);
    await expect(svc.get<{ items: number[] }>("hot-products", "k1")).resolves.toEqual({ items: [1, 2] });
    await expect(svc.get("hot-products", "missing")).resolves.toBeNull();
  });

  it("del and delScope invalidate", async () => {
    const redis = new FakeRedis();
    const svc = new CacheService();
    (svc as any).redis = redis;
    await svc.set("hot-products", "a", 1, 60);
    await svc.set("hot-products", "b", 2, 60);
    await svc.del("hot-products", "a");
    await expect(svc.get("hot-products", "a")).resolves.toBeNull();
    await svc.delScope("hot-products");
    expect(redis.del).toHaveBeenCalledWith("pv:hot-products:b");
  });

  it("incr is atomic with TTL on first hit (rate limits)", async () => {
    const redis = new FakeRedis();
    const svc = new CacheService();
    (svc as any).redis = redis;
    expect(await svc.incr("rate-limit", "ip-1", 300)).toBe(1);
    expect(redis.expire).toHaveBeenCalledWith("pv:rate-limit:ip-1", 300);
    expect(await svc.incr("rate-limit", "ip-1", 300)).toBe(2);
  });
});
