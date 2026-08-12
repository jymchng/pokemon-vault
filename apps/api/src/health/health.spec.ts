import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller";
import { HealthService, ReadinessReport } from "./health.service";
import { PrismaService } from "../prisma/prisma.service";

const okPrisma = { $queryRawUnsafe: async () => [{ "?column?": 1 }] } as unknown as PrismaService;
const badPrisma = {
  $queryRawUnsafe: async () => {
    throw new Error("connection refused db.internal:5432");
  },
} as unknown as PrismaService;

describe("health (§63)", () => {
  describe("liveness", () => {
    it("returns ok without dependencies", async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [HealthService, { provide: PrismaService, useValue: okPrisma }],
      }).compile();
      const ctrl = moduleRef.get(HealthController);
      expect(ctrl.liveness()).toEqual({ status: "ok", service: "pokemon-vault-api" });
      expect(ctrl.live()).toEqual({ status: "ok" });
    });
  });

  describe("readiness (HealthService)", () => {
    it("reports ok when both dependencies answer", async () => {
      const svc = new HealthService(okPrisma, {
        db: async () => "ok",
        redis: async () => "ok",
      });
      await expect(svc.checkReady()).resolves.toEqual({
        status: "ok",
        checks: { db: "ok", redis: "ok" },
      });
    });

    it("degrades when any dependency fails", async () => {
      const svc = new HealthService(okPrisma, {
        db: async () => "ok",
        redis: async () => "error",
      });
      const report = await svc.checkReady();
      expect(report.status).toBe("degraded");
      expect(report.checks).toEqual({ db: "ok", redis: "error" });
    });

    it("real DB probe catches failures without leaking internals", async () => {
      // badPrisma throws an error containing a hostname — the report must not
      // contain it; the check value is exactly "error".
      const svc = new HealthService(badPrisma, { redis: async () => "ok" });
      const report = await svc.checkReady();
      expect(report.status).toBe("degraded");
      expect(JSON.stringify(report)).not.toContain("db.internal");
      expect(report.checks.db).toBe("error");
    });

    it("real Redis probe catches failures without leaking internals", async () => {
      const svc = new HealthService(okPrisma, { db: async () => "ok" });
      // No override for redis → real probe against an unreachable URL.
      (svc as any).redis = new (await import("ioredis")).default(
        "redis://127.0.0.1:1",
        { lazyConnect: true, maxRetriesPerRequest: null, connectTimeout: 200, retryStrategy: () => null },
      );
      const report: ReadinessReport = await svc.checkReady();
      expect(report.checks.redis).toBe("error");
      expect(JSON.stringify(report)).not.toContain("127.0.0.1");
      await (svc as any).onModuleDestroy?.();
    });
  });

  describe("readiness (controller → HTTP status)", () => {
    it("returns 200 on healthy readiness", async () => {
      const svc = new HealthService(okPrisma, { db: async () => "ok", redis: async () => "ok" });
      const ctrl = new HealthController(svc);
      const res: any = { statusCode: 0, status(code: number) { this.statusCode = code; return this; } };
      const report = await ctrl.ready(res);
      expect(report.status).toBe("ok");
      expect(res.statusCode).toBe(200);
    });

    it("returns 503 on degraded readiness", async () => {
      const svc = new HealthService(badPrisma, { redis: async () => "error" });
      const ctrl = new HealthController(svc);
      const res: any = { statusCode: 0 };
      res.status = (code: number) => {
        res.statusCode = code;
        return res;
      };
      const report = await ctrl.ready(res as any);
      expect(res.statusCode).toBe(503);
      expect(report.status).toBe("degraded");
    });
  });
});
