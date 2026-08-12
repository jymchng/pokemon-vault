import { describe, expect, it } from "vitest";
import { PrivacyService } from "./privacy.service";
import { AuditService } from "../audit/audit.service";

/** Fake Prisma with the surface PrivacyService uses. */
class FakePrisma {
  user = {
    findUnique: async ({ where }: any) => ({ id: where.id, email: "user@example.com", status: "ACTIVE" }),
    update: async ({ data }: any) => ({ ...data }),
  };
  cart = { deleteMany: vi.fn(async () => ({ count: 1 })) };
  authSession = { deleteMany: vi.fn(async () => ({ count: 2 })), findMany: async () => [{ id: "s1" }] };
  refreshToken = { deleteMany: vi.fn(async () => ({ count: 1 })) };
  oneTimeToken = { deleteMany: vi.fn(async () => ({ count: 1 })) };
  notificationPreference = {
    findUnique: async () => ({ emailOptIn: false, promotions: true }),
    deleteMany: async () => ({ count: 1 }),
    upsert: async ({ create }: any) => create,
  };
  order = { findMany: async () => [{ id: "o1" }] };
  collectionItem = { findMany: async () => [{ cardId: "c1" }] };
  rewardAccount = { findMany: async () => [{ xp: 500 }] };
  notification = { findMany: async () => [{ type: "SYSTEM" }] };
  $transaction = async (ops: any[]) => ops;
}

const fakeAudit = { record: async () => {} } as unknown as AuditService;

describe("privacy / GDPR (§103-104)", () => {
  it("exports the user's data without other users' info", async () => {
    const svc = new PrivacyService(new FakePrisma() as any, fakeAudit);
    const data = await svc.exportUser("u1");
    expect(data.user!.email).toBe("user@example.com");
    expect(data.orders).toHaveLength(1);
    expect(data.collection).toHaveLength(1);
    expect(data.rewards).toEqual([{ xp: 500 }]);
    expect(data.notifications).toHaveLength(1);
    expect(data.exportedAt).toBeTruthy();
  });

  it("anonymizes PII and clears derived rows on account deletion", async () => {
    const prisma = new FakePrisma();
    let updateData: any = null;
    (prisma.user as any).update = async ({ data }: any) => { updateData = data; return { ...data }; };
    const svc = new PrivacyService(prisma as any, fakeAudit);
    const result = await svc.deleteAccount("u1", "u1");
    expect(result.deleted).toBe(true);
    // update data: email anonymized, password nulled, names cleared
    expect(updateData.email).toMatch(/^deleted-.*@removed\.invalid$/);
    expect(updateData.passwordHash).toBe("!");
    expect(updateData.firstName).toBeNull();
    expect(updateData.status).toBe("DELETED");
    expect(prisma.cart.deleteMany).toHaveBeenCalled();
    expect(prisma.authSession.deleteMany).toHaveBeenCalled();
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
  });

  it("marketing consent defaults off and can be toggled", async () => {
    const svc = new PrivacyService(new FakePrisma() as any, fakeAudit);
    expect((await svc.getConsent("u1")).marketingOptIn).toBe(false);
    expect((await svc.setMarketingOptIn("u1", true)).marketingOptIn).toBe(true);
  });
});
