import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { buildCursorPage, decodeCursor } from "../common/cursor-pagination";
import { ProductsService } from "./products.service";
import { ProductsRepository } from "./products.repository";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { slugify } from "./products.service";

const passGuard = { canActivate: () => true };

class FakeProductsRepository {
  rows: any[] = [];
  seq = 0;

  async findAll(opts: any) {
    let items = this.rows.filter((r) => !r.deletedAt);
    if (!opts.includeDraft) items = items.filter((r) => r.status === "ACTIVE");
    if (opts.category) items = items.filter((r) => r.category === opts.category);
    if (opts.productType) items = items.filter((r) => r.productType === opts.productType);
    if (opts.status) items = items.filter((r) => r.status === opts.status);
    if (opts.search) {
      const q = opts.search.toLowerCase();
      items = items.filter((r) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q));
    }
    return { items: items.slice(0, opts.limit), total: items.length, page: opts.page, limit: opts.limit };
  }

  /** Cursor-based public listing (§86) — fake mirrors the real query. */
  async findAllCursor(opts: any) {
    let items = this.rows.filter((r) => !r.deletedAt && r.status === "ACTIVE");
    if (opts.category) items = items.filter((r) => r.category === opts.category);
    if (opts.productType) items = items.filter((r) => r.productType === opts.productType);
    if (opts.search) {
      const q = opts.search.toLowerCase();
      items = items.filter((r) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q));
    }
    void buildCursorPage; void decodeCursor;
    const cursorId = decodeCursor(opts.cursor);
    if (cursorId) items = items.filter((r) => r.id > cursorId);
    return buildCursorPage(items, { limit: opts.limit });
  }

  async findBySlugOrId(slugOrId: string, includeDraft = false) {
    const row = this.rows.find(
      (r) => !r.deletedAt && (r.slug === slugOrId || r.id === slugOrId) && (includeDraft || r.status === "ACTIVE"),
    );
    return row ? { ...row, variants: row.variants ?? [] } : null;
  }

  async create(data: any) {
    if (this.rows.some((r) => r.sku === data.sku || r.slug === data.slug)) {
      const err: any = new Error("unique");
      err.code = "P2002";
      throw err;
    }
    const row = {
      id: `p${++this.seq}`,
      ...data,
      variants: (data.variants ?? []).map((v: any, i: number) => ({ id: `v${i}`, ...v })),
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

  async addVariant(productId: string, data: any) {
    const row = this.rows.find((r) => r.id === productId);
    if (!row) return null;
    if ((row.variants ?? []).some((v: any) => v.sku === data.sku)) {
      const err: any = new Error("unique");
      err.code = "P2002";
      throw err;
    }
    const variant = { id: `v${this.seq++}`, ...data };
    row.variants = [...(row.variants ?? []), variant];
    return { ...variant };
  }

  async updateVariant(variantId: string, data: any) {
    for (const row of this.rows) {
      const v = (row.variants ?? []).find((x: any) => x.id === variantId);
      if (v) {
        Object.assign(v, data);
        return { ...v };
      }
    }
    const err: any = new Error("not found");
    err.code = "P2025";
    throw err;
  }

  async deleteVariant(variantId: string) {
    for (const row of this.rows) {
      const idx = (row.variants ?? []).findIndex((x: any) => x.id === variantId);
      if (idx >= 0) {
        row.variants.splice(idx, 1);
        return;
      }
    }
    const err: any = new Error("not found");
    err.code = "P2025";
    throw err;
  }
}

async function makeModule(repo: FakeProductsRepository) {
  return Test.createTestingModule({
    controllers: [ProductsController],
    providers: [ProductsService, { provide: ProductsRepository, useValue: repo }],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .overrideGuard(RolesGuard)
    .useValue(passGuard)
    .compile();
}

const BASE_PRODUCT = {
  sku: "CARD-TEST-001",
  slug: "test-card",
  name: "Test Card",
  price: 19.99,
  productType: "SINGLE_CARD",
  status: "ACTIVE",
  currency: "USD",
};

describe("G9 products module", () => {
  it("creates a product with nested variants (auto-slug)", async () => {
    const repo = new FakeProductsRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(ProductsController);
    const res = await ctrl.create({
      ...BASE_PRODUCT,
      variants: [{ sku: "CARD-TEST-001-X", name: "Test Card Foil", price: 24.99 }],
    });
    expect(res.data.sku).toBe("CARD-TEST-001");
    expect(res.data.slug).toBe("test-card");
    expect(res.data.variants).toHaveLength(1);
    expect(res.data.variants[0].sku).toBe("CARD-TEST-001-X");
  });

  it("rejects duplicate SKU/slug with ConflictException", async () => {
    const repo = new FakeProductsRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(ProductsController);
    await ctrl.create(BASE_PRODUCT as any);
    await expect(ctrl.create({ ...BASE_PRODUCT, slug: "test-card" } as any)).rejects.toMatchObject({ status: 409 });
  });

  it("lists only ACTIVE products for the public catalog", async () => {
    const repo = new FakeProductsRepository();
    await repo.create({ ...BASE_PRODUCT, id: "x1" });
    await repo.create({ ...BASE_PRODUCT, sku: "X2", slug: "x2", name: "Draft Card", status: "DRAFT", id: "x2" });
    const mod = await makeModule(repo);
    const ctrl = mod.get(ProductsController);
    const res = await ctrl.index({});
    expect(res.data.items.length).toBe(1);
    expect(res.data.items[0].sku).toBe("CARD-TEST-001");
  });

  it("filters by category and productType", async () => {
    const repo = new FakeProductsRepository();
    await repo.create({ ...BASE_PRODUCT, category: "Graded Cards", productType: "GRADED_CARD" });
    await repo.create({ ...BASE_PRODUCT, sku: "PKG-1", slug: "pkg-1", name: "Pack", category: "Booster Packs", productType: "BOOSTER_PACK", price: 5.99 });
    const mod = await makeModule(repo);
    const ctrl = mod.get(ProductsController);
    const graded = await ctrl.index({ productType: "GRADED_CARD" });
    expect(graded.data.items.length).toBe(1);
    expect(graded.data.items[0].productType).toBe("GRADED_CARD");
    const packs = await ctrl.index({ category: "Booster Packs" });
    expect(packs.data.items.length).toBe(1);
    expect(packs.data.items[0].sku).toBe("PKG-1");
  });

  it("gets a product by slug and 404s for unknown", async () => {
    const repo = new FakeProductsRepository();
    await repo.create(BASE_PRODUCT);
    const mod = await makeModule(repo);
    const ctrl = mod.get(ProductsController);
    const found = await ctrl.show("test-card");
    expect(found.data.slug).toBe("test-card");
    await expect(ctrl.show("nope")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("soft-deletes a product (removed from listings, keeps row)", async () => {
    const repo = new FakeProductsRepository();
    await repo.create(BASE_PRODUCT);
    const mod = await makeModule(repo);
    const ctrl = mod.get(ProductsController);
    await ctrl.remove("p1");
    const list = await ctrl.index({});
    expect(list.data.items.length).toBe(0);
    expect(repo.rows.find((r) => r.id === "p1").deletedAt).toBeTruthy();
  });

  it("adds, updates, and deletes variants", async () => {
    const repo = new FakeProductsRepository();
    await repo.create(BASE_PRODUCT);
    const mod = await makeModule(repo);
    const ctrl = mod.get(ProductsController);
    const added = await ctrl.addVariant("p1", { sku: "V-1", name: "Variant One", price: 29.99 } as any);
    expect(added.data.sku).toBe("V-1");
    const updated = await ctrl.updateVariant(added.data.id, { price: 39.99 } as any);
    expect(updated.data.price).toBe(39.99);
    await ctrl.removeVariant(added.data.id);
    const product = await ctrl.show("test-card");
    expect(product.data.variants).toHaveLength(0);
  });

  it("slugify normalizes names", () => {
    expect(slugify("Pokémon 151 Elite Trainer Box!")).toBe("pok-mon-151-elite-trainer-box");
    expect(slugify("  Charizard ex — PSA 10  ")).toBe("charizard-ex-psa-10");
  });
});
