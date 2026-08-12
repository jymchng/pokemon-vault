import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ShippingController } from "./shipping.controller";
import { ShippingService } from "./shipping.service";
import { ShippingRepository } from "./shipping.repository";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";

const passGuard = { canActivate: () => true };

class FakeShippingRepository {
  addresses: any[] = [];
  shipments: any[] = [];
  items: any[] = [];
  seq = 0;

  async findAddresses(userId: string) {
    return this.addresses.filter((a) => a.userId === userId);
  }
  async findAddress(userId: string, id: string) {
    return this.addresses.find((a) => a.id === id && a.userId === userId) ?? null;
  }
  async createAddress(userId: string, data: any) {
    if (data.isDefault) this.addresses.forEach((a) => { if (a.userId === userId) a.isDefault = false; });
    const row = { id: `a${++this.seq}`, userId, ...data, createdAt: new Date(), updatedAt: new Date() };
    this.addresses.push(row);
    return { ...row };
  }
  async updateAddress(userId: string, id: string, data: any) {
    const row = this.addresses.find((a) => a.id === id && a.userId === userId);
    if (!row) return null;
    if (data.isDefault) this.addresses.forEach((a) => { if (a.userId === userId) a.isDefault = false; });
    Object.assign(row, data);
    return { ...row };
  }
  async deleteAddress(userId: string, id: string) {
    const before = this.addresses.length;
    this.addresses = this.addresses.filter((a) => !(a.id === id && a.userId === userId));
    return before !== this.addresses.length;
  }
  async findShipmentsForOrder(orderId: string) {
    return this.shipments.filter((s) => s.orderId === orderId);
  }
  async findShipment(id: string) {
    const s = this.shipments.find((x) => x.id === id);
    return s ? { ...s, order: { orderNumber: "PV-1" } } : null;
  }
  async findShipmentsByUser(userId: string) {
    const itemIds = new Set(this.items.filter((i) => i.userId === userId).map((i) => i.shipmentId));
    return this.shipments
      .filter((s) => itemIds.has(s.id) || s.orderUserId === userId)
      .map((s) => ({ ...s, order: { orderNumber: "PV-1" } }));
  }
  async createShipment(data: any) {
    const row = { id: `s${++this.seq}`, status: "PENDING", carrier: null, trackingNumber: null, trackingUrl: null, estimatedDelivery: null, shippedAt: null, deliveredAt: null, createdAt: new Date(), updatedAt: new Date(), ...data };
    this.shipments.push(row);
    return { ...row, order: { orderNumber: "PV-1" } };
  }
  async updateShipment(id: string, data: any) {
    const row = this.shipments.find((x) => x.id === id);
    if (!row) return null;
    Object.assign(row, data);
    return { ...row, order: { orderNumber: "PV-1" } };
  }
  async findShipmentItems(shipmentId: string) {
    return this.items.filter((i) => i.shipmentId === shipmentId);
  }
  async addShipmentItem(shipmentId: string, data: any) {
    const row = { id: `i${++this.seq}`, shipmentId, ...data };
    this.items.push(row);
    return { ...row };
  }
}

async function makeModule(repo: FakeShippingRepository) {
  return Test.createTestingModule({
    controllers: [ShippingController],
    providers: [ShippingService, { provide: ShippingRepository, useValue: repo }],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .overrideGuard(RolesGuard)
    .useValue(passGuard)
    .compile();
}

const req = (id = "u1", role = "CUSTOMER") => ({ user: { id, sessionId: "s", role } });

describe("G18 shipping module", () => {
  it("creates and lists owner-scoped addresses", async () => {
    const repo = new FakeShippingRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(ShippingController);
    const created = await ctrl.createAddress(req() as any, { line1: "1 Main St", city: "Springfield", country: "US", isDefault: true } as any);
    expect(created.data.line1).toBe("1 Main St");
    const list = await ctrl.listAddresses(req() as any);
    expect(list.data).toHaveLength(1);
    const other = await ctrl.listAddresses(req("u2") as any);
    expect(other.data).toHaveLength(0);
  });

  it("updates and deletes addresses (404 on other user's)", async () => {
    const repo = new FakeShippingRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(ShippingController);
    const created = await ctrl.createAddress(req() as any, { line1: "1 Main St", city: "X" } as any);
    const updated = await ctrl.updateAddress(req() as any, created.data.id, { city: "New City" } as any);
    expect(updated.data.city).toBe("New City");
    await expect(ctrl.updateAddress(req("u2") as any, created.data.id, { city: "Hack" } as any)).rejects.toBeInstanceOf(NotFoundException);
    await ctrl.deleteAddress(req() as any, created.data.id);
    expect(repo.addresses).toHaveLength(0);
  });

  it("staff creates a shipment for an order", async () => {
    const repo = new FakeShippingRepository();
    const mod = await makeModule(repo);
    const created = await mod.get(ShippingController).createShipment({ orderId: "11111111-1111-4111-8111-111111111111", carrier: "UPS", trackingNumber: "1Z999" } as any);
    expect(created.data.status).toBe("PENDING");
    expect(created.data.carrier).toBe("UPS");
  });

  it("shipment state machine with automatic timestamps", async () => {
    const repo = new FakeShippingRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(ShippingController);
    const s = await ctrl.createShipment({ orderId: "11111111-1111-4111-8111-111111111111" } as any);
    const label = await ctrl.updateShipment(s.data.id, { status: "LABEL_CREATED" } as any);
    expect(label.data.status).toBe("LABEL_CREATED");
    expect(label.data.shippedAt).toBeTruthy(); // auto timestamp
    const transit = await ctrl.updateShipment(s.data.id, { status: "IN_TRANSIT", trackingNumber: "1Z111" } as any);
    expect(transit.data.trackingNumber).toBe("1Z111");
    await expect(ctrl.updateShipment(s.data.id, { status: "DELIVERED" } as any)).rejects.toBeInstanceOf(BadRequestException);
    const ofd = await ctrl.updateShipment(s.data.id, { status: "OUT_FOR_DELIVERY" } as any);
    expect(ofd.data.status).toBe("OUT_FOR_DELIVERY");
    const delivered = await ctrl.updateShipment(s.data.id, { status: "DELIVERED" } as any);
    expect(delivered.data.status).toBe("DELIVERED");
    expect(delivered.data.deliveredAt).toBeTruthy();
  });

  it("users see only their shipments (via shipment items)", async () => {
    const repo = new FakeShippingRepository();
    const s = await repo.createShipment({ orderId: "o1" });
    await repo.addShipmentItem(s.id, { userId: "u1", quantity: 1 });
    const mod = await makeModule(repo);
    const mine = await mod.get(ShippingController).myShipments(req("u1") as any);
    expect(mine.data).toHaveLength(1);
    const others = await mod.get(ShippingController).myShipments(req("u2") as any);
    expect(others.data).toHaveLength(0);
  });

  it("owner sees a shipment created without items via order ownership", async () => {
    const repo = new FakeShippingRepository();
    // Admin creates a shipment for an order owned by u1; no ShipmentItem rows.
    await repo.createShipment({ orderId: "o1", orderUserId: "u1", carrier: "USPS", trackingNumber: "9400" });
    const mod = await makeModule(repo);
    const mine = await mod.get(ShippingController).myShipments(req("u1") as any);
    expect(mine.data).toHaveLength(1);
    expect(mine.data[0].trackingNumber).toBe("9400");
    // A different user must NOT see it.
    const others = await mod.get(ShippingController).myShipments(req("u2") as any);
    expect(others.data).toHaveLength(0);
  });
});
