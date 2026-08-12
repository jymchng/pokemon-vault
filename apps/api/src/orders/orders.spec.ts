import { Test } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrdersRepository } from "./orders.repository";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";

const passGuard = { canActivate: () => true };

const ORDER = {
  id: "11111111-1111-4111-8111-111111111111",
  orderNumber: "PV-10482",
  userId: "u1",
  email: "u1@x.dev",
  status: "CONFIRMED",
  subtotal: 100,
  discount: 0,
  shipping: 0,
  tax: 0,
  total: 100,
  currency: "USD",
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    { id: "i1", productId: "p1", productName: "Pack", sku: "PKG-1", unitPrice: 50, quantity: 2, tax: 0, discount: 0, metadata: null },
  ],
};

class FakeOrdersRepository {
  rows = [{ ...ORDER, items: [...ORDER.items] }];

  async findForUser(userId: string, query: any) {
    const items = this.rows.filter((r) => r.userId === userId);
    return { items: items.slice(0, query.limit), total: items.length, page: query.page, limit: query.limit };
  }
  async findAll(query: any) {
    return { items: this.rows.slice(0, query.limit), total: this.rows.length, page: query.page, limit: query.limit };
  }
  async findById(id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }
  async findByRef(ref: string) {
    return this.rows.find((r) => r.orderNumber === ref || r.id === ref) ?? null;
  }
  async updateStatus(id: string, status: string) {
    const row = this.rows.find((r) => r.id === id);
    if (!row) return null;
    row.status = status;
    return { ...row };
  }
}

async function makeModule(repo: FakeOrdersRepository) {
  return Test.createTestingModule({
    controllers: [OrdersController],
    providers: [OrdersService, { provide: OrdersRepository, useValue: repo }],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .overrideGuard(RolesGuard)
    .useValue(passGuard)
    .compile();
}

const req = (id: string, role = "CUSTOMER") => ({ user: { id, sessionId: "s", role } });

describe("G15 orders module", () => {
  it("lists only the owner's orders (scoped)", async () => {
    const repo = new FakeOrdersRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(OrdersController).index(req("u1") as any, {});
    expect(res.data.total).toBe(1);
    expect(res.data.items[0].orderNumber).toBe("PV-10482");
  });

  it("owner can view their order by human-readable number", async () => {
    const repo = new FakeOrdersRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(OrdersController).show(req("u1") as any, "PV-10482");
    expect(res.data.items).toHaveLength(1);
    expect(res.data.items[0]).toMatchObject({ productName: "Pack", sku: "PKG-1", unitPrice: 50, quantity: 2 });
  });

  it("customer cannot view another user's order (IDOR-safe)", async () => {
    const repo = new FakeOrdersRepository();
    const mod = await makeModule(repo);
    await expect(mod.get(OrdersController).show(req("u2") as any, "PV-10482")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("staff can view another user's order", async () => {
    const repo = new FakeOrdersRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(OrdersController).show(req("u2", "STAFF") as any, "PV-10482");
    expect(res.data.orderNumber).toBe("PV-10482");
  });

  it("staff list all orders", async () => {
    const repo = new FakeOrdersRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(OrdersController).adminIndex({});
    expect(res.data.total).toBe(1);
  });

  it("staff transition follows the state machine", async () => {
    const repo = new FakeOrdersRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(OrdersController);
    const res = await ctrl.updateStatus("PV-10482", { status: "PROCESSING" } as any);
    expect(res.data.status).toBe("PROCESSING");
    await expect(ctrl.updateStatus("PV-10482", { status: "PACKED" } as any)).resolves.toBeTruthy();
    await expect(ctrl.updateStatus("PV-10482", { status: "DELIVERED" } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("404 for unknown order", async () => {
    const repo = new FakeOrdersRepository();
    const mod = await makeModule(repo);
    await expect(mod.get(OrdersController).show(req("u1") as any, "PV-99999")).rejects.toBeInstanceOf(NotFoundException);
  });
});
