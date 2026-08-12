import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";
import { CartRepository, mapCart } from "./cart.repository";
import { OptionalAuthGuard } from "../auth/optional-auth.guard";

const passGuard = { canActivate: () => true };

const PID = "44444444-4444-4444-8444-444444444444";

class FakeCartRepository {
  cart: any = { id: "cart1", userId: "u1", sessionId: null, items: [] };
  products = new Map<string, any>();
  seq = 0;

  constructor() {
    this.products.set(PID, {
      id: PID,
      sku: "PKG-TEST",
      name: "Test Pack",
      price: 5.99,
      inventoryItems: [{ quantity: 10, reserved: 0 }],
    });
  }

  async getOrCreateCart(owner: any) {
    if (owner.userId) return { id: "cart1", userId: owner.userId, sessionId: null };
    return { id: "cart2", userId: null, sessionId: owner.sessionId ?? "guest-default" };
  }
  async findCart(id: string) {
    const items = this.cart.items.map((i: any) => {
      const p = this.products.get(i.productId);
      return {
        ...i,
        product: p,
      };
    });
    const isGuest = id === "cart2";
    return {
      id,
      userId: isGuest ? null : this.cart.userId,
      sessionId: isGuest ? "guest-123" : this.cart.sessionId,
      items,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  async findProductWithStock(productId: string) {
    return this.products.get(productId) ?? null;
  }
  async addItem(_cartId: string, productId: string, quantity: number) {
    const ex = this.cart.items.find((i: any) => i.productId === productId);
    if (ex) ex.quantity += quantity;
    else this.cart.items.push({ id: `ci${++this.seq}`, productId, quantity, createdAt: new Date(), updatedAt: new Date() });
  }
  async updateItemQuantity(_cartId: string, productId: string, quantity: number) {
    const ex = this.cart.items.find((i: any) => i.productId === productId);
    if (ex) ex.quantity = quantity;
  }
  async removeItem(_cartId: string, productId: string) {
    this.cart.items = this.cart.items.filter((i: any) => i.productId !== productId);
  }
  async clearCart() {
    this.cart.items = [];
  }
  async adoptSessionCart() {}
  async loadCartFor(owner: any) {
    const cart = await this.getOrCreateCart(owner);
    const full = await this.findCart(cart.id);
    return mapCart(full);
  }
}

async function makeModule(repo: FakeCartRepository) {
  return Test.createTestingModule({
    controllers: [CartController],
    providers: [CartService, { provide: CartRepository, useValue: repo }],
  })
    .overrideGuard(OptionalAuthGuard)
    .useValue(passGuard)
    .compile();
}

const req = (sessionId?: string) => ({ user: { id: "u1", sessionId: "s1" }, headers: { "x-session-id": sessionId } });

describe("G13 cart module", () => {
  it("adds an item with server-computed price (never trusts client)", async () => {
    const repo = new FakeCartRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(CartController).addItem(req() as any, { productId: PID, quantity: 2 } as any);
    const item = res.data.items[0];
    expect(item.unitPrice).toBe(5.99); // from Product.price, not client
    expect(item.lineTotal).toBe(11.98);
    expect(res.data.subtotal).toBe(11.98);
  });

  it("rejects adding beyond available stock", async () => {
    const repo = new FakeCartRepository();
    const mod = await makeModule(repo);
    await expect(
      mod.get(CartController).addItem(req() as any, { productId: PID, quantity: 11 } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects unknown product", async () => {
    const repo = new FakeCartRepository();
    const mod = await makeModule(repo);
    await expect(
      mod.get(CartController).addItem(req() as any, { productId: "99999999-9999-4999-8999-999999999999", quantity: 1 } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("PATCH updates quantity with validation", async () => {
    const repo = new FakeCartRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(CartController);
    await ctrl.addItem(req() as any, { productId: PID, quantity: 1 } as any);
    const updated = await ctrl.updateItem(req() as any, PID, { quantity: 5 } as any);
    expect(updated.data.items[0].quantity).toBe(5);
    await expect(ctrl.updateItem(req() as any, PID, { quantity: 99 } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("DELETE removes item; DELETE all clears", async () => {
    const repo = new FakeCartRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(CartController);
    await ctrl.addItem(req() as any, { productId: PID, quantity: 1 } as any);
    const afterRemove = await ctrl.removeItem(req() as any, PID);
    expect(afterRemove.data.items).toHaveLength(0);
    await ctrl.addItem(req() as any, { productId: PID, quantity: 2 } as any);
    const cleared = await ctrl.clear(req() as any);
    expect(cleared.data.items).toHaveLength(0);
  });

  it("guest cart works via session id without user", async () => {
    const repo = new FakeCartRepository();
    const mod = await makeModule(repo);
    const guestReq = { user: undefined, headers: { "x-session-id": "guest-123" } };
    const res = await mod.get(CartController).addItem(guestReq as any, { productId: PID, quantity: 1 } as any);
    expect(res.data.items[0].productId).toBe(PID);
    expect(res.data.sessionId).toBe("guest-123");
  });
});
