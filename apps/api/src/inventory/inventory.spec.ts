import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { InventoryRepository } from "./inventory.repository";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";

const passGuard = { canActivate: () => true };

class FakeInventoryRepository {
  items = new Map<string, any>();
  reservations: any[] = [];
  movements: any[] = [];
  locations: any[] = [];

  async findAllItems() {
    return [...this.items.values()].map((i) => ({ ...i, available: i.quantity - i.reserved }));
  }
  async findItemById(id: string) {
    return this.items.get(id) ?? null;
  }
  async findMovements() {
    return this.movements;
  }
  async findLocations() {
    return this.locations;
  }
  async createLocation(name: string, code: string) {
    const loc = { id: `loc${this.locations.length + 1}`, name, code };
    this.locations.push(loc);
    return loc;
  }
  async applyChange(itemId: string, delta: number, reason: string, opts: any = {}) {
    const item = this.items.get(itemId);
    if (!item) return { ok: false };
    if (opts.where?.quantity?.gte !== undefined && item.quantity < opts.where.quantity.gte) {
      return { ok: false };
    }
    if (item.quantity + delta < 0) return { ok: false };
    item.quantity += delta;
    this.movements.push({ itemId, change: delta, reason });
    return { ok: true, item: { ...item } };
  }
  async findExpiredReservations(now: Date) {
    return this.reservations.filter((r) => !r.releasedAt && r.expiresAt < now);
  }
  async releaseReservation(id: string, now: Date) {
    const r = this.reservations.find((x) => x.id === id);
    if (!r || r.releasedAt) return false;
    const item = this.items.get(r.itemId);
    if (!item || item.reserved < r.quantity) return false;
    item.reserved -= r.quantity;
    r.releasedAt = now;
    this.movements.push({ itemId: r.itemId, change: 0, reason: "RELEASE" });
    return true;
  }
}

async function makeModule(repo: FakeInventoryRepository) {
  return Test.createTestingModule({
    controllers: [InventoryController],
    providers: [InventoryService, { provide: InventoryRepository, useValue: repo }],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .overrideGuard(RolesGuard)
    .useValue(passGuard)
    .compile();
}

describe("G12 inventory module", () => {
  it("lists items with available = quantity - reserved", async () => {
    const repo = new FakeInventoryRepository();
    repo.items.set("i1", { id: "i1", productId: "p1", sku: "A", productName: "A", quantity: 10, reserved: 3, status: "AVAILABLE" });
    const mod = await makeModule(repo);
    const res = await mod.get(InventoryController).index();
    expect(res.data[0].available).toBe(7);
  });

  it("restocks (positive movement) and damages (negative movement)", async () => {
    const repo = new FakeInventoryRepository();
    repo.items.set("i1", { id: "i1", productId: "p1", quantity: 10, reserved: 0 });
    const mod = await makeModule(repo);
    const ctrl = mod.get(InventoryController);
    const restocked = await ctrl.restock("i1", { quantity: 5 } as any);
    expect(restocked.data.quantity).toBe(15);
    const damaged = await ctrl.damage("i1", { quantity: 3 } as any);
    expect(damaged.data.quantity).toBe(12);
    expect(repo.movements.map((m) => m.reason)).toEqual(["RESTOCK", "DAMAGE"]);
  });

  it("rejects damage beyond available stock", async () => {
    const repo = new FakeInventoryRepository();
    repo.items.set("i1", { id: "i1", productId: "p1", quantity: 2, reserved: 0 });
    const mod = await makeModule(repo);
    await expect(mod.get(InventoryController).damage("i1", { quantity: 5 } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("releases expired reservations and decrements reserved", async () => {
    const repo = new FakeInventoryRepository();
    repo.items.set("i1", { id: "i1", productId: "p1", quantity: 10, reserved: 4 });
    const past = new Date(Date.now() - 1000);
    repo.reservations.push({ id: "r1", itemId: "i1", quantity: 4, expiresAt: past, releasedAt: null });
    const mod = await makeModule(repo);
    const svc = mod.get(InventoryService);
    const released = await svc.releaseExpiredReservations(new Date());
    expect(released).toBe(1);
    expect(repo.items.get("i1").reserved).toBe(0);
    expect(repo.reservations[0].releasedAt).toBeTruthy();
  });
});
