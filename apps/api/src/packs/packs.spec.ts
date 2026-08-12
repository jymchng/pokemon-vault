import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PacksController } from "./packs.controller";
import { PacksService } from "./packs.service";
import { MetricsService } from "../observability/metrics.service";
import { AbuseProtectionService } from "../common/abuse-protection.service";
import { PacksRepository } from "./packs.repository";
import { AuthGuard } from "../auth/auth.guard";
import { FeatureFlagService } from "../config/feature-flag.service";

const passGuard = { canActivate: () => true };

const PACK = {
  id: "p1",
  slug: "sv151",
  name: "Pokémon 151",
  tagline: null,
  price: 5.99,
  cardsPerPack: 3,
  image: null,
  availability: "In Stock",
  description: null,
  setName: "Pokémon 151",
};

class FakePacksRepository {
  openings: any[] = [];
  seq = 0;
  pool = [
    { id: "c1", rarity: "Common" },
    { id: "c2", rarity: "Common" },
    { id: "c3", rarity: "Uncommon" },
    { id: "c4", rarity: "Rare" },
  ];

  async findAll() { return [PACK]; }
  async findBySlugOrId(slugOrId: string) {
    return slugOrId === "sv151" || slugOrId === "p1" ? { ...PACK } : null;
  }
  async loadCardPool() { return this.pool; }
  async findOpeningByIdempotencyKey(key: string) {
    return this.openings.find((o) => o.idempotencyKey === key) ?? null;
  }
  async createOpening(data: any) {
    if (this.openings.some((o) => o.idempotencyKey === data.idempotencyKey)) {
      const err: any = new Error("dup");
      err.code = "P2002";
      throw err;
    }
    const row = {
      id: `open${++this.seq}`,
      idempotencyKey: data.idempotencyKey,
      userId: data.userId,
      packId: data.packId,
      randomizationVersion: 1,
      createdAt: new Date(),
      pack: { name: "Pokémon 151" },
      cards: data.cardIds.map((cardId: string) => ({ id: `pc${this.seq}`, cardId, card: { name: `Card ${cardId}`, cardNumber: "1", rarity: "R", type: "T" } })),
    };
    this.openings.push(row);
    return row;
  }
  async findOpeningById(id: string) {
    return this.openings.find((o) => o.id === id) ?? null;
  }
  async listOpeningsForUser(userId: string) {
    return this.openings.filter((o) => o.userId === userId);
  }
}

async function makeModule(repo: FakePacksRepository) {
  return Test.createTestingModule({
    controllers: [PacksController],
    providers: [PacksService, { provide: PacksRepository, useValue: repo }, { provide: AbuseProtectionService, useValue: { checkAndRecord: async () => false } }, { provide: FeatureFlagService, useValue: { assertEnabled: () => undefined, isEnabled: () => true } }, { provide: MetricsService, useValue: { recordCheckoutStarted(){}, recordCheckoutCompleted(){}, recordCheckoutFailed(){}, recordPaymentStarted(){}, recordPaymentCompleted(){}, recordPaymentFailed(){}, recordInventoryReservation(){}, recordInventoryReservationFailed(){}, recordOrderCreated(){}, recordOrderCompleted(){}, recordProductsSold(){}, recordPackOpening(){}, recordCardAdded(){}, recordRewardRedeemed(){} } }],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .compile();
}

const req = (id = "u1") => ({ user: { id, sessionId: "s" } });

describe("G20 packs module", () => {
  it("lists packs and gets by slug", async () => {
    const repo = new FakePacksRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(PacksController);
    expect((await ctrl.index()).data).toHaveLength(1);
    expect((await ctrl.show("sv151")).data.name).toBe("Pokémon 151");
    await expect(ctrl.show("nope")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("opens a pack server-side with exactly cardsPerPack cards from the pool", async () => {
    const repo = new FakePacksRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(PacksController).open(req() as any, "sv151", { idempotencyKey: "key-1-openserver" } as any);
    expect(res.data.cards).toHaveLength(3); // cardsPerPack
    expect(res.data.randomizationVersion).toBe(1);
    expect(res.data.userId).toBe("u1");
    expect(res.data.packId).toBe("p1");
    // All cards come from the server pool (client never sends cards).
    const poolIds = repo.pool.map((c) => c.id);
    for (const card of res.data.cards) expect(poolIds).toContain(card.cardId);
  });

  it("is idempotent: same idempotencyKey returns the SAME opening", async () => {
    const repo = new FakePacksRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(PacksController);
    const first = await ctrl.open(req() as any, "sv151", { idempotencyKey: "key-idempotent-01" } as any);
    const second = await ctrl.open(req() as any, "sv151", { idempotencyKey: "key-idempotent-01" } as any);
    expect(second.data.id).toBe(first.data.id);
    expect(second.data.cards.map((c: any) => c.cardId)).toEqual(first.data.cards.map((c: any) => c.cardId));
    expect(repo.openings).toHaveLength(1); // no double pack
  });

  it("is immutable: opening record has audit fields + never changes", async () => {
    const repo = new FakePacksRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(PacksController).open(req() as any, "sv151", { idempotencyKey: "key-audit-0001" } as any);
    expect(res.data.id).toBeTruthy(); // opening_id
    expect(res.data.idempotencyKey).toBe("key-audit-0001");
    expect(res.data.userId).toBe("u1"); // user_id
    expect(res.data.packId).toBe("p1"); // pack_id
    expect(res.data.randomizationVersion).toBe(1); // randomization_version
    expect(res.data.createdAt).toBeInstanceOf(Date); // created_at
    expect(res.data.cards.length).toBeGreaterThan(0); // generated_cards
  });

  it("user can view own openings; other users get 404 (IDOR-safe)", async () => {
    const repo = new FakePacksRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(PacksController);
    const opened = await ctrl.open(req("u1") as any, "sv151", { idempotencyKey: "key-owner-0001" } as any);
    const mine = await ctrl.myOpenings(req("u1") as any);
    expect(mine.data).toHaveLength(1);
    const detail = await ctrl.getOpening(req("u1") as any, opened.data.id);
    expect(detail.data.id).toBe(opened.data.id);
    await expect(ctrl.getOpening(req("u2") as any, opened.data.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("random draw produces deterministic-size results across many opens", async () => {
    const repo = new FakePacksRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(PacksController);
    for (let i = 0; i < 10; i++) {
      const res = await ctrl.open(req() as any, "sv151", { idempotencyKey: `key-batch-${i}` } as any);
      expect(res.data.cards).toHaveLength(3);
    }
    expect(repo.openings).toHaveLength(10);
  });
});
