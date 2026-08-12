import { describe, expect, it } from "vitest";
import { MaintenanceService } from "./maintenance.service";
import { PrismaService } from "../prisma/prisma.service";

/** Minimal Prisma delegate fake covering every model/job MaintenanceService touches. */
class FakePrisma {
  inventoryReservation = {
    findMany: async ({ where }: any) =>
      where?.releasedAt === null && where?.expiresAt?.lt
        ? [
            { id: "r1", itemId: "i1", quantity: 2, orderId: "o1" },
            { id: "r2", itemId: "i2", quantity: 1, orderId: null },
          ]
        : [],
    update: async ({ data }: any) => ({ ...data }),
  };
  inventoryItem = { update: async ({ data }: any) => ({ ...data }) };
  cart = { deleteMany: async () => ({ count: 7 }) };
  reward = { updateMany: async () => ({ count: 3 }) };
  authSession = { deleteMany: async () => ({ count: 5 }) };
  refreshToken = { deleteMany: async () => ({ count: 9 }) };
  emailLog = { deleteMany: async () => ({ count: 42 }) };
  order = {
    findUnique: async ({ where }: any) =>
      where.id === "o1" ? { id: "o1", status: "PENDING" } : null,
    update: async ({ data }: any) => ({ ...data }),
    count: async () => 4,
  };
  packOpening = { count: async () => 11 };
  rewardRedemption = { count: async () => 2 };
  dailyAnalytics = {
    findUnique: async ({ where }: any) =>
      where.day === "2026-08-11" ? { day: "2026-08-11", orders: 1, packOpenings: 2, rewardRedemptions: 0 } : null,
    update: async ({ data }: any) => ({ ...data }),
    create: async ({ data }: any) => ({ ...data }),
  };
  $transaction = async (ops: any[]) => Promise.all(ops);
  $executeRawUnsafe = async () => 0;
}

function makeService(prisma: any = new FakePrisma()) {
  return new MaintenanceService(
    prisma as unknown as PrismaService,
    {
      releaseReservations: "* * * * *",
      purgeAbandonedCarts: "0 3 * * *",
      expireRewards: "0 * * * *",
      purgeStaleSessions: "0 * * * *",
      purgeEmailLogs: "30 3 * * *",
      aggregateAnalytics: "15 2 * * *",
      dbMaintenance: "45 3 * * *",
    },
    { cartTtlDays: 30, emailLogTtlDays: 90 },
  );
}

describe("maintenance / cron jobs (§106)", () => {
  it("releaseExpiredReservations releases stock and cancels PENDING orders", async () => {
    const prisma = new FakePrisma();
    const svc = makeService(prisma);
    const res = await svc.releaseExpiredReservations();
    expect(res.reservationsReleased).toBe(2);
    expect(res.ordersCancelled).toBe(1); // o1 PENDING -> CANCELLED; o2 no orderId
  });

  it("purgeAbandonedCarts deletes carts older than the TTL", async () => {
    const svc = makeService();
    const res = await svc.purgeAbandonedCarts();
    expect(res.cartsDeleted).toBe(7);
  });

  it("expireRewards flips ACTIVE rewards past expiresAt", async () => {
    const svc = makeService();
    const res = await svc.expireRewards();
    expect(res.rewardsExpired).toBe(3);
  });

  it("purgeStaleSessions removes expired/revoked sessions + refresh tokens", async () => {
    const svc = makeService();
    const res = await svc.purgeStaleSessions();
    expect(res.sessionsDeleted).toBe(5);
    expect(res.refreshTokensDeleted).toBe(9);
  });

  it("purgeEmailLogs deletes logs older than retention", async () => {
    const svc = makeService();
    const res = await svc.purgeEmailLogs();
    expect(res.emailLogsDeleted).toBe(42);
  });

  it("aggregateAnalytics upserts the daily row (create for new day)", async () => {
    const svc = makeService();
    const res = await svc.aggregateAnalytics();
    expect(res.orders).toBe(4);
    expect(res.packOpenings).toBe(11);
    expect(res.rewardRedemptions).toBe(2);
    expect(res.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("dbMaintenance vacuums the hot tables", async () => {
    const svc = makeService();
    const res = await svc.dbMaintenance();
    expect(res.tablesVacuumed).toBeGreaterThan(0);
  });
});
