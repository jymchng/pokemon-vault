import { Test } from "@nestjs/testing";
import { RewardsController } from "./rewards.controller";
import { RewardsService } from "./rewards.service";
import { RewardsRepository } from "./rewards.repository";

class FakeRewardsRepository {
  accounts = new Map<string, any>();
  txs: any[] = [];
  seq = 0;

  async findAll() {
    return [...this.accounts.values()];
  }

  async awardPurchaseXp(userId: string, amountUsd: number, orderId: string) {
    const existing = this.txs.find((t) => t.reference === orderId && t.reason === "PURCHASE");
    if (existing) return 0;
    const xp = Math.max(1, Math.floor(amountUsd));
    const acc = this.accounts.get(userId) ?? { id: `a${++this.seq}`, userId, xp: 0 };
    acc.xp += xp;
    this.accounts.set(userId, acc);
    this.txs.push({ id: `t${++this.seq}`, accountId: acc.id, delta: xp, reason: "PURCHASE", reference: orderId });
    return xp;
  }
}

async function makeModule(repo: FakeRewardsRepository) {
  return Test.createTestingModule({
    controllers: [RewardsController],
    providers: [RewardsService, { provide: RewardsRepository, useValue: repo }],
  }).compile();
}

it("rewards: service list returns []", async () => {
  const repo = new FakeRewardsRepository();
  const moduleRef = await makeModule(repo);
  const ctrl = moduleRef.get(RewardsController);
  expect(await ctrl.index()).toEqual({ data: [] });
});

describe("G17 rewards purchase XP", () => {
  it("awards XP for a completed purchase (1 XP per USD)", async () => {
    const repo = new FakeRewardsRepository();
    const mod = await makeModule(repo);
    const svc = mod.get(RewardsService);
    const xp = await svc.awardPurchaseXp("u1", 11.98, "o1");
    expect(xp).toBe(11);
    expect(repo.accounts.get("u1").xp).toBe(11);
    expect(repo.txs).toHaveLength(1);
    expect(repo.txs[0]).toMatchObject({ reason: "PURCHASE", reference: "o1", delta: 11 });
  });

  it("is idempotent per order (no double award)", async () => {
    const repo = new FakeRewardsRepository();
    const mod = await makeModule(repo);
    const svc = mod.get(RewardsService);
    await svc.awardPurchaseXp("u1", 50, "o1");
    const second = await svc.awardPurchaseXp("u1", 50, "o1");
    expect(second).toBe(0);
    expect(repo.accounts.get("u1").xp).toBe(50);
    expect(repo.txs).toHaveLength(1);
  });
});
