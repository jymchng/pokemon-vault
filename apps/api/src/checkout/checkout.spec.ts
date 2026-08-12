import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { MetricsService } from "../observability/metrics.service";
import { CheckoutRepository } from "./checkout.repository";
import { AuthGuard } from "../auth/auth.guard";
import { CartService } from "../cart/cart.service";
import { RewardsService } from "../rewards/rewards.service";
import { EmailService } from "../email/email.service";

const passGuard = { canActivate: () => true };

const fakeCartService = { getCart: async () => ({ items: [] }) };
const fakeRewardsService = { awardPurchaseXp: async () => 0 };
const fakeEmail = { sendOrderConfirmation: async () => ({}) } as unknown as EmailService;

const ORDER = {
  id: "o1",
  orderNumber: "ORD-1",
  userId: "u1",
  status: "PENDING",
  subtotal: 100,
  total: 100,
  items: [{ productName: "Test", sku: "T1", unitPrice: 50, quantity: 2 }],
  payment: { status: "PENDING" },
  reservations: [{ id: "r1", itemId: "i1", quantity: 2, releasedAt: null }],
};

class FakeCheckoutRepository {
  order: any = { ...ORDER, reservations: [...ORDER.reservations] };
  finalized = false;
  cancelled = false;

  async createOrderWithReservations(_userId: string | null, _email: string | null, items: any[], ttl: number) {
    if (items[0]?.quantity > 10) {
      const err = new Error("INSUFFICIENT_STOCK");
      throw err;
    }
    return { order: this.order, reservations: [{ reservationId: "r1", itemId: "i1", sku: "T1", quantity: 2, expiresAt: new Date(Date.now() + ttl) }] };
  }
  async finalizeOrder(orderId: string, providerRef: string) {
    if (this.order.status !== "PENDING") {
      const err = new Error("ORDER_NOT_PENDING");
      throw err;
    }
    this.finalized = true;
    this.order.status = "CONFIRMED";
    return { ...this.order, payment: { status: "SUCCEEDED", providerRef } };
  }
  async cancelOrder(orderId: string) {
    this.cancelled = true;
    this.order.status = "CANCELLED";
    return this.order;
  }
  async findUserEmail() {
    return "u1@x.dev";
  }
  async findOrderForUser(orderId: string, userId: string | null) {
    if (orderId !== "o1") return null;
    return this.order;
  }
}

async function makeModule(repo: FakeCheckoutRepository) {
  return Test.createTestingModule({
    controllers: [CheckoutController],
    providers: [
      { provide: MetricsService, useValue: { recordCheckoutStarted(){}, recordCheckoutCompleted(){}, recordCheckoutFailed(){}, recordPaymentStarted(){}, recordPaymentCompleted(){}, recordPaymentFailed(){}, recordInventoryReservation(){}, recordInventoryReservationFailed(){}, recordOrderCreated(){}, recordOrderCompleted(){}, recordProductsSold(){}, recordPackOpening(){}, recordCardAdded(){}, recordRewardRedeemed(){} } },
      CheckoutService,
      { provide: CheckoutRepository, useValue: repo },
      { provide: CartService, useValue: fakeCartService },
      { provide: RewardsService, useValue: fakeRewardsService },
      { provide: EmailService, useValue: fakeEmail },
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .compile();
}

describe("G12 checkout module", () => {
  it("starts checkout: verifies stock + reserves + creates PENDING order", async () => {
    const repo = new FakeCheckoutRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(CheckoutController).start({ user: { id: "u1" } } as any, { items: [{ productId: "33333333-3333-4333-8333-333333333333", quantity: 2 }] } as any);
    expect(res.data.order.status).toBe("PENDING");
    expect(res.data.reservations).toHaveLength(1);
    expect(res.data.reservations[0].expiresAt).toBeInstanceOf(Date);
  });

  it("rejects insufficient stock", async () => {
    const repo = new FakeCheckoutRepository();
    const mod = await makeModule(repo);
    await expect(
      mod.get(CheckoutController).start({ user: { id: "u1" } } as any, { items: [{ productId: "33333333-3333-4333-8333-333333333333", quantity: 11 }] } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("pay finalizes reservation -> sale (CONFIRMED + SUCCEEDED)", async () => {
    const repo = new FakeCheckoutRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(CheckoutController).pay({ user: { id: "u1" } } as any, "o1", { paymentMethod: "card" } as any);
    expect(res.data.status).toBe("CONFIRMED");
    expect(res.data.payment.status).toBe("SUCCEEDED");
    expect(repo.finalized).toBe(true);
  });

  it("cannot pay twice (order not pending)", async () => {
    const repo = new FakeCheckoutRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(CheckoutController);
    await ctrl.pay({ user: { id: "u1" } } as any, "o1", {} as any);
    await expect(ctrl.pay({ user: { id: "u1" } } as any, "o1", {} as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("cancel releases reservations and marks CANCELLED", async () => {
    const repo = new FakeCheckoutRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(CheckoutController).cancel({ user: { id: "u1" } } as any, "o1");
    expect(res.data.status).toBe("CANCELLED");
    expect(repo.cancelled).toBe(true);
  });

  it("404s for unknown order", async () => {
    const repo = new FakeCheckoutRepository();
    const mod = await makeModule(repo);
    await expect(mod.get(CheckoutController).get({ user: { id: "u1" } } as any, "nope")).rejects.toBeInstanceOf(NotFoundException);
  });
});
