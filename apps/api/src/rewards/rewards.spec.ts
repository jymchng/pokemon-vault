import { Test } from "@nestjs/testing";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { RewardsController } from "./rewards.controller";
import { RewardsService } from "./rewards.service";
import { MetricsService } from "../observability/metrics.service";
import { IdempotencyService } from "../common/idempotency.service";
import { RewardsRepository } from "./rewards.repository";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";

const passGuard = { canActivate: () => true };
const REWARD_ID = "88888888-8888-4888-8888-888888888888";

class FakeRewardsRepository {
  accounts = new Map<string, any>();
  txs: any[] = [];
  rewards: any[] = [];
  redemptions: any[] = [];
  tiers = [
    { name: "Level 1", level: 1, xpRequired: 0 },
    { name: "Level 2", level: 2, xpRequired: 250 },
  ];
  seq = 0;

  constructor() {
    this.rewards.push({ id: REWARD_ID, name: "Free Booster Pack", description: null, type: "PACK", xpCost: 100, inventory: 5, status: "ACTIVE", expiresAt: null, createdAt: new Date() });
  }

  async getAccountWithTiers(userId: string) {
    const acc = this.accounts.get(userId) ?? { id: `a${userId}`, userId, xp: 0 };
    const current = [...this.tiers].reverse().find((t) => acc.xp >= t.xpRequired) ?? this.tiers[0];
    const next = this.tiers.find((t) => t.xpRequired > acc.xp) ?? null;
    return { id: acc.id, userId, xp: acc.xp, level: current.level, levelName: current.name, xpRequiredForNext: next?.xpRequired ?? null, progressPercent: 50, updatedAt: new Date() };
  }
  async listTransactions(userId: string) {
    const acc = this.accounts.get(userId);
    if (!acc) return [];
    return this.txs.filter((t) => t.accountId === acc.id);
  }
  async awardXp(userId: string, delta: number, reason: string, reference?: string | null) {
    if (reference && this.txs.some((t) => t.reference === reference && t.reason === reason)) return 0;
    const acc = this.accounts.get(userId) ?? { id: `a${userId}`, userId, xp: 0 };
    acc.xp += delta;
    this.accounts.set(userId, acc);
    this.txs.push({ id: `t${++this.seq}`, accountId: acc.id, delta, reason, reference: reference ?? null, createdAt: new Date() });
    return delta;
  }
  async listRewards() { return this.rewards; }
  async findReward(id: string) { return this.rewards.find((r) => r.id === id) ?? null; }
  async createReward(data: any) {
    const row = { id: `r${++this.seq}`, createdAt: new Date(), ...data };
    this.rewards.push(row);
    return row;
  }
  async updateReward(id: string, data: any) {
    const row = this.rewards.find((r) => r.id === id);
    if (!row) return null;
    Object.assign(row, data);
    return row;
  }
  async redeemReward(userId: string, rewardId: string) {
    const reward = this.rewards.find((r) => r.id === rewardId);
    if (!reward) throw new Error("REWARD_NOT_FOUND");
    if (reward.status !== "ACTIVE") throw new Error("REWARD_DISABLED");
    if (reward.inventory <= 0) throw new Error("REWARD_OUT_OF_STOCK");
    const acc = this.accounts.get(userId) ?? { id: `a${userId}`, userId, xp: 0 };
    if (acc.xp < reward.xpCost) throw new Error("INSUFFICIENT_XP");
    if (this.redemptions.some((rd) => rd.accountId === acc.id && rd.rewardId === rewardId)) {
      const err: any = new Error("dup");
      err.code = "P2002";
      throw err;
    }
    reward.inventory -= 1;
    acc.xp -= reward.xpCost;
    this.accounts.set(userId, acc);
    this.txs.push({ id: `t${++this.seq}`, accountId: acc.id, delta: -reward.xpCost, reason: "REDEMPTION", reference: rewardId, createdAt: new Date() });
    const rd = { id: `rd${++this.seq}`, accountId: acc.id, rewardId, rewardName: reward.name, userId, status: "REDEEMED", createdAt: new Date() };
    this.redemptions.push(rd);
    return rd;
  }
  async listRedemptions(userId: string) {
    return this.redemptions.filter((r) => r.userId === userId);
  }
  async listTiers() { return this.tiers; }
  async createTier(data: any) {
    if (this.tiers.some((t) => t.level === data.level)) {
      const err: any = new Error("dup");
      err.code = "P2002";
      throw err;
    }
    this.tiers.push(data);
    return data;
  }
  async findAll() { return [...this.accounts.values()]; }
  async awardPurchaseXp(userId: string, amountUsd: number, orderId: string) {
    const xp = Math.max(1, Math.floor(amountUsd));
    return this.awardXp(userId, xp, "PURCHASE", orderId);
  }
}

async function makeModule(repo: FakeRewardsRepository) {
  return Test.createTestingModule({
    controllers: [RewardsController],
    providers: [RewardsService, { provide: RewardsRepository, useValue: repo }, { provide: MetricsService, useValue: { recordCheckoutStarted(){}, recordCheckoutCompleted(){}, recordCheckoutFailed(){}, recordPaymentStarted(){}, recordPaymentCompleted(){}, recordPaymentFailed(){}, recordInventoryReservation(){}, recordInventoryReservationFailed(){}, recordOrderCreated(){}, recordOrderCompleted(){}, recordProductsSold(){}, recordPackOpening(){}, recordCardAdded(){}, recordRewardRedeemed(){} } }, { provide: IdempotencyService, useValue: { run: async (_s: string, _k: string, _u: string, _b: unknown, op: () => Promise<any>) => ({ replayed: false, data: await op() }) } }],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .overrideGuard(RolesGuard)
    .useValue(passGuard)
    .compile();
}

const req = (id = "u1") => ({ user: { id, sessionId: "s", role: "CUSTOMER" } });
const staffReq = (id = "u1") => ({ user: { id, sessionId: "s", role: "STAFF" } });

describe("G21 rewards module", () => {
  it("catalog lists rewards", async () => {
    const repo = new FakeRewardsRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(RewardsController).index();
    expect(res.data).toHaveLength(1);
    expect(res.data[0].name).toBe("Free Booster Pack");
  });

  it("account shows xp, level and progress from configurable tiers", async () => {
    const repo = new FakeRewardsRepository();
    await repo.awardXp("u1", 300, "PURCHASE", "PV-1");
    const mod = await makeModule(repo);
    const acc = await mod.get(RewardsController).me(req() as any);
    expect(acc.data.xp).toBe(300);
    expect(acc.data.level).toBe(2); // 300 >= 250
    expect(acc.data.levelName).toBe("Level 2");
  });

  it("XP ledger records history with reasons", async () => {
    const repo = new FakeRewardsRepository();
    await repo.awardXp("u1", 100, "PURCHASE", "PV-1");
    await repo.awardXp("u1", 50, "PACK_OPENING", "open-1");
    const mod = await makeModule(repo);
    const ledger = await mod.get(RewardsController).ledger(req() as any);
    expect(ledger.data).toHaveLength(2);
    expect(ledger.data.map((t: any) => t.reason).sort()).toEqual(["PACK_OPENING", "PURCHASE"]);
  });

  it("idempotent XP award (same reference+reason → no double)", async () => {
    const repo = new FakeRewardsRepository();
    await repo.awardXp("u1", 100, "PURCHASE", "PV-1");
    const second = await repo.awardXp("u1", 100, "PURCHASE", "PV-1");
    expect(second).toBe(0);
    expect(repo.accounts.get("u1").xp).toBe(100);
  });

  it("atomic redemption: reserve + deduct + create redemption", async () => {
    const repo = new FakeRewardsRepository();
    await repo.awardXp("u1", 500, "PURCHASE", "PV-1");
    const mod = await makeModule(repo);
    const res = await mod.get(RewardsController).redeem(req() as any, { rewardId: REWARD_ID } as any);
    expect(res.data.status).toBe("REDEEMED");
    expect(res.data.rewardName).toBe("Free Booster Pack");
    expect(repo.accounts.get("u1").xp).toBe(400); // 500 - 100
    expect(repo.rewards[0].inventory).toBe(4); // reserved/decremented
    expect(repo.txs.some((t) => t.reason === "REDEMPTION" && t.delta === -100)).toBe(true);
  });

  it("prevents double redemption (unique account+reward)", async () => {
    const repo = new FakeRewardsRepository();
    await repo.awardXp("u1", 1000, "PURCHASE", "PV-1");
    const mod = await makeModule(repo);
    const ctrl = mod.get(RewardsController);
    await ctrl.redeem(req() as any, { rewardId: REWARD_ID } as any);
    await expect(ctrl.redeem(req() as any, { rewardId: REWARD_ID } as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects insufficient XP and out-of-stock", async () => {
    const repo = new FakeRewardsRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(RewardsController);
    await expect(ctrl.redeem(req() as any, { rewardId: REWARD_ID } as any)).rejects.toMatchObject({ code: "REWARD_NOT_ELIGIBLE" }); // insufficient xp (0 < 100)
    await repo.awardXp("u1", 500, "PURCHASE", "PV-1");
    repo.rewards[0].inventory = 0;
    await expect(ctrl.redeem(req() as any, { rewardId: REWARD_ID } as any)).rejects.toMatchObject({ code: "REWARD_NOT_ELIGIBLE" }); // out of stock
  });

  it("staff can create/update rewards and grant XP", async () => {
    const repo = new FakeRewardsRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(RewardsController);
    const created = await ctrl.createReward({ name: "5% Discount", type: "DISCOUNT", xpCost: 250, inventory: 10 } as any);
    expect(created.data.type).toBe("DISCOUNT");
    const updated = await ctrl.updateReward(created.data.id, { xpCost: 300 } as any);
    expect(updated.data.xpCost).toBe(300);
    const grant = await ctrl.awardXp(staffReq() as any, { delta: 50, reason: "PROMOTION", reference: "promo-1" } as any);
    expect(grant.data.awarded).toBe(50);
  });
});
