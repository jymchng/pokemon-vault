import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CardsController } from "./cards.controller";
import { CardsService } from "./cards.service";
import { CardsRepository } from "./cards.repository";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";

const passGuard = { canActivate: () => true };

class FakeCardsRepository {
  rows: any[] = [];
  links: Array<{ cardId: string; productId: string }> = [];
  products: Map<string, any> = new Map();
  seq = 0;

  async findAll(opts: any) {
    let items = this.rows.filter((r) => !r.deletedAt);
    if (opts.setName) items = items.filter((r) => r.setName === opts.setName);
    if (opts.rarity) items = items.filter((r) => r.rarity === opts.rarity);
    if (opts.type) items = items.filter((r) => r.type === opts.type);
    if (opts.language) items = items.filter((r) => r.language === opts.language);
    if (opts.search) {
      const q = opts.search.toLowerCase();
      items = items.filter((r) => r.name.toLowerCase().includes(q) || (r.cardNumber ?? "").toLowerCase().includes(q));
    }
    return { items: items.slice(0, opts.limit), total: items.length, page: opts.page, limit: opts.limit };
  }

  async findById(id: string, includeLinked = false) {
    const row = this.rows.find((r) => r.id === id && !r.deletedAt);
    if (!row) return null;
    if (includeLinked) {
      row.linkedProducts = this.links
        .filter((l) => l.cardId === id)
        .map((l) => {
          const p = this.products.get(l.productId);
          return p
            ? { productId: p.id, sku: p.sku, name: p.name, price: p.price, status: "ACTIVE", inventoryQuantity: p.qty ?? 0, grade: row.grade ?? null, condition: row.condition ?? null, language: row.language }
            : null;
        })
        .filter(Boolean);
    }
    return { ...row };
  }

  async create(data: any) {
    const row = {
      id: `c${++this.seq}`,
      name: data.name,
      setName: data.setName,
      cardNumber: data.cardNumber ?? null,
      rarity: data.rarity ?? null,
      type: data.type ?? null,
      hp: data.hp ?? null,
      language: data.language ?? "EN",
      imageUrl: data.imageUrl ?? null,
      description: data.description ?? null,
      grade: data.grade ?? null,
      condition: data.condition ?? null,
      marketPrice: data.marketPrice ?? null,
      population: data.population ?? null,
      metadata: data.metadata ?? null,
      setId: data.setId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rows.push(row);
    return { ...row };
  }

  async update(id: string, data: any) {
    const row = this.rows.find((r) => r.id === id);
    if (!row) {
      const err: any = new Error("not found");
      err.code = "P2025";
      throw err;
    }
    Object.assign(row, data);
    return { ...row };
  }

  async softDelete(id: string) {
    const row = this.rows.find((r) => r.id === id);
    if (!row) {
      const err: any = new Error("not found");
      err.code = "P2025";
      throw err;
    }
    row.deletedAt = new Date();
  }

  async linkProduct(cardId: string, productId: string) {
    if (this.links.some((l) => l.cardId === cardId && l.productId === productId)) {
      const err: any = new Error("unique");
      err.code = "P2002";
      throw err;
    }
    if (!this.products.has(productId)) {
      const err: any = new Error("fk");
      err.code = "P2003";
      throw err;
    }
    this.links.push({ cardId, productId });
  }

  async unlinkProduct(cardId: string, productId: string) {
    this.links = this.links.filter((l) => !(l.cardId === cardId && l.productId === productId));
  }
}

async function makeModule(repo: FakeCardsRepository) {
  return Test.createTestingModule({
    controllers: [CardsController],
    providers: [CardsService, { provide: CardsRepository, useValue: repo }],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .overrideGuard(RolesGuard)
    .useValue(passGuard)
    .compile();
}

const BASE_CARD = {
  name: "Charizard ex",
  setName: "Pokémon 151",
  cardNumber: "223/197",
  rarity: "Special Illustration Rare",
  type: "Fire",
  hp: "330",
  language: "EN",
};

describe("G10 cards module", () => {
  it("creates a card with all §14 fields", async () => {
    const repo = new FakeCardsRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(CardsController).create({
      ...BASE_CARD,
      imageUrl: "https://example.com/card.png",
      grade: "PSA_10",
      marketPrice: 489.99,
      metadata: { artist: "Mitsuhiro Arita" },
    } as any);
    expect(res.data.name).toBe("Charizard ex");
    expect(res.data.hp).toBe("330");
    expect(res.data.grade).toBe("PSA_10");
    expect(res.data.marketPrice).toBe(489.99);
    expect(res.data.metadata!["artist"]).toBe("Mitsuhiro Arita");
  });

  it("lists and filters cards", async () => {
    const repo = new FakeCardsRepository();
    await repo.create({ ...BASE_CARD, id: "c1" });
    await repo.create({ ...BASE_CARD, id: "c2", name: "Snorlax", type: "Colorless" });
    const mod = await makeModule(repo);
    const ctrl = mod.get(CardsController);
    const all = await ctrl.index({});
    expect(all.data.total).toBe(2);
    const fire = await ctrl.index({ type: "Fire" });
    expect(fire.data.total).toBe(1);
    expect(fire.data.items[0].name).toBe("Charizard ex");
    const searched = await ctrl.index({ search: "snorlax" });
    expect(searched.data.total).toBe(1);
  });

  it("gets a card with linked products (sku/price/inventory, no duplicated metadata)", async () => {
    const repo = new FakeCardsRepository();
    await repo.create({ ...BASE_CARD, id: "c1", grade: "PSA_10", condition: "Gem Mint" });
    const PID = "11111111-1111-4111-8111-111111111111";
    repo.products.set(PID, { id: PID, sku: "CARD-CHZ-PSA10", name: "Charizard ex — PSA 10", price: 489.99, qty: 50 });
    const mod = await makeModule(repo);
    const ctrl = mod.get(CardsController);
    await ctrl.linkProduct("c1", { productId: PID } as any);
    const res = await ctrl.show("c1");
    expect(res.data.linkedProducts!).toHaveLength(1);
    expect(res.data.linkedProducts![0]).toMatchObject({ sku: "CARD-CHZ-PSA10", price: 489.99, inventoryQuantity: 50 });
    // grade/condition/language projected from the Card row onto the link view.
    expect(res.data.linkedProducts![0]).toMatchObject({ grade: "PSA_10", language: "EN" });
    // Card metadata NOT duplicated on the linked product (no name/rarity there).
    expect(res.data.linkedProducts![0]).not.toHaveProperty("rarity");
  });

  it("updates a card and soft-deletes it", async () => {
    const repo = new FakeCardsRepository();
    await repo.create({ ...BASE_CARD, id: "c1" });
    const mod = await makeModule(repo);
    const ctrl = mod.get(CardsController);
    const upd = await ctrl.update("c1", { marketPrice: 500 } as any);
    expect(upd.data.marketPrice).toBe(500);
    await ctrl.remove("c1");
    await expect(ctrl.show("c1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("404s on unknown card and on linking to unknown product", async () => {
    const repo = new FakeCardsRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(CardsController);
    await expect(ctrl.show("nope")).rejects.toBeInstanceOf(NotFoundException);
    await repo.create({ ...BASE_CARD, id: "c1" });
    await expect(ctrl.linkProduct("c1", { productId: "99999999-9999-4999-8999-999999999999" } as any)).rejects.toBeInstanceOf(NotFoundException);
  });
});
