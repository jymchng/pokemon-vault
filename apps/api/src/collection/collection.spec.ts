import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CollectionController } from "./collection.controller";
import { CollectionService } from "./collection.service";
import { MetricsService } from "../observability/metrics.service";
import { CollectionRepository } from "./collection.repository";
import { AuthGuard } from "../auth/auth.guard";

const passGuard = { canActivate: () => true };

const CARD = "66666666-6666-4666-8666-666666666666";
const CARD2 = "77777777-7777-4777-8777-777777777777";

class FakeCollectionRepository {
  items: any[] = [];
  activity: any[] = [];
  sets = [
    { id: "s1", name: "Set A", slug: "set-a", series: "S", totalCards: 2 },
    { id: "s2", name: "Set B", slug: "set-b", series: "S", totalCards: 1 },
  ];
  cardSet = new Map<string, string>([
    [CARD, "s1"],
    [CARD2, "s1"],
  ]);
  seq = 0;

  async getOrCreateCollection() { return { id: "c1" }; }
  async findCollection() { return { id: "c1" }; }
  async findItems(userId: string) {
    return this.items.map((i) => ({
      id: i.id, collectionId: "c1", cardId: i.cardId,
      cardName: "Card", cardNumber: "1", rarity: "R", setName: "Set A",
      quantity: i.quantity, condition: i.condition ?? null, grade: i.grade ?? null,
      source: i.source, acquiredAt: i.acquiredAt ?? null, purchaseOrderId: i.purchaseOrderId ?? null,
    }));
  }
  async findItem(userId: string, cardId: string) {
    return this.items.find((i) => i.cardId === cardId) ?? null;
  }
  async addItem(userId: string, data: any) {
    const ex = this.items.find((i) => i.cardId === data.cardId);
    if (ex) ex.quantity += data.quantity;
    else this.items.push({ id: `i${++this.seq}`, cardId: data.cardId, quantity: data.quantity, source: data.source ?? "MANUAL_ENTRY", condition: data.condition ?? null, grade: data.grade ?? null, acquiredAt: data.acquiredAt ?? new Date(), purchaseOrderId: data.purchaseOrderId ?? null });
    return (await this.findItems(userId)).find((i) => i.cardId === data.cardId)!;
  }
  async updateItem(userId: string, cardId: string, data: any) {
    const item = this.items.find((i) => i.cardId === cardId);
    if (!item) return null;
    Object.assign(item, data);
    return (await this.findItems(userId)).find((i) => i.cardId === cardId)!;
  }
  async removeItem(userId: string, cardId: string, q = 1) {
    const item = this.items.find((i) => i.cardId === cardId);
    if (!item) return false;
    if (item.quantity - q <= 0) this.items = this.items.filter((i) => i.cardId !== cardId);
    else item.quantity -= q;
    return true;
  }
  async setProgress() {
    const ownedBySet = new Map<string, number>();
    for (const i of this.items) {
      const setId = this.cardSet.get(i.cardId);
      if (setId) ownedBySet.set(setId, (ownedBySet.get(setId) ?? 0) + 1);
    }
    return this.sets.map((s) => {
      const owned = ownedBySet.get(s.id) ?? 0;
      return { setId: s.id, setName: s.name, slug: s.slug, series: s.series, ownedCards: owned, totalCards: s.totalCards, completionPercentage: Math.round((owned / s.totalCards) * 10000) / 100 };
    });
  }
  async setProgressFor(setId: string) {
    const all = await this.setProgress();
    return all.find((s) => s.setId === setId) ?? null;
  }
  async recordActivity(userId: string, data: any) {
    const row = { id: `a${++this.seq}`, userId, createdAt: new Date(), ...data, metadata: data.metadata ?? null };
    this.activity.push(row);
    return row;
  }
  async listActivity(userId: string, page: number, limit: number) {
    return { items: this.activity.slice(0, limit), total: this.activity.length };
  }
}

async function makeModule(repo: FakeCollectionRepository) {
  return Test.createTestingModule({
    controllers: [CollectionController],
    providers: [CollectionService, { provide: CollectionRepository, useValue: repo }, { provide: MetricsService, useValue: { recordCheckoutStarted(){}, recordCheckoutCompleted(){}, recordCheckoutFailed(){}, recordPaymentStarted(){}, recordPaymentCompleted(){}, recordPaymentFailed(){}, recordInventoryReservation(){}, recordInventoryReservationFailed(){}, recordOrderCreated(){}, recordOrderCompleted(){}, recordProductsSold(){}, recordPackOpening(){}, recordCardAdded(){}, recordRewardRedeemed(){} } }],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .compile();
}

const req = () => ({ user: { id: "u1", sessionId: "s1" } });

describe("G19 collection module", () => {
  it("adds a card with quantity + source and records CARD_ADDED activity", async () => {
    const repo = new FakeCollectionRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(CollectionController).addItem(req() as any, { cardId: CARD, quantity: 2, source: "PACK_OPENING" } as any);
    expect(res.data.quantity).toBe(2);
    expect(res.data.source).toBe("PACK_OPENING");
    expect(repo.activity).toHaveLength(1);
    expect(repo.activity[0].eventType).toBe("CARD_ADDED");
  });

  it("merges multiple copies into one line (upsert quantity)", async () => {
    const repo = new FakeCollectionRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(CollectionController);
    await ctrl.addItem(req() as any, { cardId: CARD, quantity: 1 } as any);
    const second = await ctrl.addItem(req() as any, { cardId: CARD, quantity: 3 } as any);
    expect(second.data.quantity).toBe(4);
    expect((await ctrl.items(req() as any)).data).toHaveLength(1);
  });

  it("updates and removes items (CARD_REMOVED on full removal)", async () => {
    const repo = new FakeCollectionRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(CollectionController);
    await ctrl.addItem(req() as any, { cardId: CARD, quantity: 2 } as any);
    const updated = await ctrl.updateItem(req() as any, CARD, { grade: "PSA_10", condition: "Gem Mint" } as any);
    expect(updated.data.grade).toBe("PSA_10");
    await ctrl.removeItem(req() as any, CARD, "2" as any);
    expect((await ctrl.items(req() as any)).data).toHaveLength(0);
    expect(repo.activity.some((a) => a.eventType === "CARD_REMOVED")).toBe(true);
  });

  it("computes set progress (owned/total/percentage) with multiple sets", async () => {
    const repo = new FakeCollectionRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(CollectionController);
    await ctrl.addItem(req() as any, { cardId: CARD, quantity: 1 } as any);
    await ctrl.addItem(req() as any, { cardId: CARD2, quantity: 1 } as any);
    const sets = await ctrl.sets(req() as any);
    const setA = sets.data.find((s: any) => s.slug === "set-a")!;
    expect(setA.ownedCards).toBe(2);
    expect(setA.totalCards).toBe(2);
    expect(setA.completionPercentage).toBe(100);
    const detail = await ctrl.setDetail(req() as any, "s1");
    expect(detail.data.ownedCards).toBe(2);
  });

  it("404s on missing set or item", async () => {
    const repo = new FakeCollectionRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(CollectionController);
    await expect(ctrl.setDetail(req() as any, "nope")).rejects.toBeInstanceOf(NotFoundException);
    await expect(ctrl.removeItem(req() as any, CARD, "1" as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("activity stream is immutable + paged", async () => {
    const repo = new FakeCollectionRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(CollectionController);
    await ctrl.addItem(req() as any, { cardId: CARD, quantity: 1 } as any);
    const act = await ctrl.activity(req() as any, {});
    expect(act.meta.total).toBe(1);
    expect(act.data[0]).toMatchObject({ eventType: "CARD_ADDED", entityType: "card", entityId: CARD });
    expect(act.data[0].metadata).toEqual({ quantity: 1, source: "MANUAL_ENTRY" });
  });
});

describe("G43 N+1 avoidance (§96)", () => {
  it("setProgress uses batched queries (groupBy + IN) — no per-card round trips", async () => {
    const { CollectionRepository } = await import("./collection.repository");
    const calls: string[] = [];
    const prisma: any = {
      collectionItem: {
        groupBy: async () => { calls.push("groupBy"); return [{ cardId: "c1" }, { cardId: "c2" }]; },
      },
      card: {
        findMany: async (args: any) => { calls.push("card.findMany"); expect(args.where.id.in.length).toBe(2); return [{ id: "c1", setId: "s1" }, { id: "c2", setId: "s1" }]; },
      },
      set: { findMany: async () => { calls.push("set.findMany"); return [{ id: "s1", name: "S1", slug: "s1", series: "x", totalCards: 5 }]; } },
      collection: { findFirst: async () => ({ id: "col1" }), findUnique: async () => ({ id: "col1" }) },
    };
    const repo = new CollectionRepository(prisma);
    const progress = await (repo as any).setProgress("u1");
    // exactly 3 queries for the whole computation — no per-card loop
    expect(calls).toEqual(["groupBy", "card.findMany", "set.findMany"]);
    expect(progress[0].ownedCards).toBe(2);
  });
});
