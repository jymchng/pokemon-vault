import { Test } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { WishlistController } from "./wishlist.controller";
import { WishlistService } from "./wishlist.service";
import { WishlistRepository } from "./wishlist.repository";
import { AuthGuard } from "../auth/auth.guard";

const passGuard = { canActivate: () => true };

const PID = "55555555-5555-4555-8555-555555555555";

class FakeWishlistRepository {
  items: any[] = [];
  products = new Map<string, any>();
  seq = 0;

  constructor() {
    this.products.set(PID, { id: PID, sku: "PKG-TEST", name: "Test Pack", price: 5.99, status: "ACTIVE" });
  }

  async findItems(userId: string) {
    return this.items
      .filter((i) => i.userId === userId)
      .map((i) => {
        const p = this.products.get(i.productId);
        return { id: i.id, productId: i.productId, sku: p?.sku, productName: p?.name, price: p?.price, status: p?.status, createdAt: i.createdAt };
      });
  }
  async findItem(userId: string, productId: string) {
    return this.items.find((i) => i.userId === userId && i.productId === productId) ?? null;
  }
  async addItem(userId: string, productId: string) {
    if (!this.products.has(productId)) {
      const err: any = new Error("fk");
      err.code = "P2003";
      throw err;
    }
    const row = { id: `w${++this.seq}`, userId, productId, createdAt: new Date() };
    this.items.push(row);
    return row;
  }
  async removeItem(userId: string, productId: string) {
    this.items = this.items.filter((i) => !(i.userId === userId && i.productId === productId));
  }
}

async function makeModule(repo: FakeWishlistRepository) {
  return Test.createTestingModule({
    controllers: [WishlistController],
    providers: [WishlistService, { provide: WishlistRepository, useValue: repo }],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .compile();
}

const req = () => ({ user: { id: "u1", sessionId: "s1" } });

describe("G14 wishlist module", () => {
  it("adds a product to the wishlist", async () => {
    const repo = new FakeWishlistRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(WishlistController).add(req() as any, { productId: PID } as any);
    expect(res.data).toHaveLength(1);
    expect(res.data[0]).toMatchObject({ productId: PID, sku: "PKG-TEST", price: 5.99 });
  });

  it("rejects duplicate product (uniqueness)", async () => {
    const repo = new FakeWishlistRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(WishlistController);
    await ctrl.add(req() as any, { productId: PID } as any);
    await expect(ctrl.add(req() as any, { productId: PID } as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it("404s on unknown product", async () => {
    const repo = new FakeWishlistRepository();
    const mod = await makeModule(repo);
    await expect(
      mod.get(WishlistController).add(req() as any, { productId: "99999999-9999-4999-8999-999999999999" } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lists and removes items", async () => {
    const repo = new FakeWishlistRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(WishlistController);
    await ctrl.add(req() as any, { productId: PID } as any);
    const list = await ctrl.index(req() as any);
    expect(list.data).toHaveLength(1);
    const afterRemove = await ctrl.remove(req() as any, PID);
    expect(afterRemove.data).toHaveLength(0);
  });

  it("scopes wishlist per user (no cross-user leakage)", async () => {
    const repo = new FakeWishlistRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(WishlistController);
    await ctrl.add(req() as any, { productId: PID } as any);
    const other = await ctrl.index({ user: { id: "u2", sessionId: "s2" } } as any);
    expect(other.data).toHaveLength(0);
  });
});
