import { describe, expect, it } from "vitest";
import { ConflictException } from "@nestjs/common";
import { IdempotencyService } from "./idempotency.service";
import { AbuseProtectionService } from "./abuse-protection.service";

/** In-memory Prisma fake for IdempotencyService. */
class FakePrisma {
  rows = new Map<string, any>();
  seq = 0;
  idempotencyRecord = {
    findUnique: async ({ where }: any) => this.rows.get(where.key) ?? null,
    upsert: async ({ where, create, update }: any) => {
      const existing = this.rows.get(where.key);
      const rec = existing
        ? { ...existing, ...update, updatedAt: new Date() }
        : { id: `r${++this.seq}`, ...create };
      this.rows.set(where.key, rec);
      return rec;
    },
    update: async ({ where, data }: any) => {
      // service passes where: { id } — find the record by id
      let found: any = null;
      let foundKey = "";
      for (const [k, v] of this.rows) {
        if (v.id === where.id) { found = v; foundKey = k; break; }
      }
      if (!found) throw new Error("not found");
      const rec = { ...found, ...data };
      this.rows.set(foundKey, rec);
      return rec;
    },
  };
  abuseEvent = {
    count: async ({ where }: any) =>
      [...this.rows.values()].filter(
        (r: any) => r.scope === where.scope && r.actorKey === where.actorKey,
      ).length,
    create: async ({ data }: any) => {
      const rec = { id: `a${++this.seq}`, ...data };
      this.rows.set(`abuse:${rec.scope}:${rec.actorKey}:${rec.id}`, rec);
      return rec;
    },
  };
}

describe("idempotency (§91)", () => {
  it("runs the operation once and replays the stored response for safe retries", async () => {
    const fake = new FakePrisma();
    const svc = new IdempotencyService(fake as any);
    let calls = 0;
    const op = async () => {
      calls++;
      return { orderId: "o1" };
    };
    const first = await svc.run("checkout", "key-1", "u1", { a: 1 }, op);
    expect(first.replayed).toBe(false);
    expect(first.data).toEqual({ orderId: "o1" });
    const second = await svc.run("checkout", "key-1", "u1", { a: 1 }, op);
    expect(second.replayed).toBe(true); // no side effects on retry
    expect(second.data).toEqual({ orderId: "o1" });
    expect(calls).toBe(1);
  });

  it("rejects key reuse with a different request body (409)", async () => {
    const fake = new FakePrisma();
    const svc = new IdempotencyService(fake as any);
    await svc.run("checkout", "key-2", "u1", { a: 1 }, async () => ({ ok: true }));
    await expect(
      svc.run("checkout", "key-2", "u1", { a: 2 }, async () => ({ ok: true })),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("marks FAILED on error and allows a retry to succeed", async () => {
    const fake = new FakePrisma();
    const svc = new IdempotencyService(fake as any);
    let fail = true;
    const op = async () => {
      if (fail) throw new Error("boom");
      return { ok: true };
    };
    await expect(svc.run("order", "key-3", "u1", {}, op)).rejects.toThrow("boom");
    fail = false;
    const retry = await svc.run("order", "key-3", "u1", {}, op);
    expect(retry.replayed).toBe(false);
    expect(retry.data).toEqual({ ok: true });
  });
});

describe("abuse protection (§90)", () => {
  it("blocks after the limit and counts events per actor", async () => {
    const fake = new FakePrisma();
    const svc = new AbuseProtectionService(fake as any);
    const rule = { scope: "login", actorKey: "ip-1", limit: 3, windowSeconds: 60 };
    expect(await svc.checkAndRecord(rule)).toBe(false); // 1
    expect(await svc.checkAndRecord(rule)).toBe(false); // 2
    expect(await svc.checkAndRecord(rule)).toBe(false); // 3
    expect(await svc.checkAndRecord(rule)).toBe(true); // blocked (4th)
    // different actor unaffected
    const rule2 = { ...rule, actorKey: "ip-2" };
    expect(await svc.checkAndRecord(rule2)).toBe(false);
  });
});
