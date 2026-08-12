import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CheckoutDto, PayDto } from "./checkout.dto";
import { CheckoutRepository } from "./checkout.repository";
import { CartService } from "../cart/cart.service";
import { RewardsService } from "../rewards/rewards.service";
import { EmailService } from "../email/email.service";
import { MetricsService } from "../observability/metrics.service";

export const RESERVATION_TTL_MS = 15 * 60 * 1000;

/**
 * Checkout workflow (§26) — a reliable, retryable pipeline with a state
 * machine on the Order (PENDING → CONFIRMED → ...), NOT a single giant
 * transaction spanning external providers:
 *
 *   1. validate cart/items        (server prices, ACTIVE products)
 *   2. calculate prices            (§27 server-side subtotal/discount/shipping/tax/total)
 *   3. validate inventory          (FOR UPDATE row locks, DB CHECK backstop)
 *   4. reserve inventory           (InventoryReservation rows)
 *   5. create payment              (PaymentProvider abstraction, idempotent)
 *   6. confirm payment             (provider confirm / webhook)
 *   7. create order                (PV- number + snapshot items)
 *   8. commit inventory            (reservation → sale, atomic per line)
 *   9. award rewards               (Collector XP, idempotent per order)
 *   10. confirm                    (order CONFIRMED)
 *
 * Each step is idempotent/retryable; the payment step is external and never
 * holds a DB transaction open across provider calls.
 */
@Injectable()
export class CheckoutService {
  constructor(
    private readonly repo: CheckoutRepository,
    private readonly cartService: CartService,
    private readonly rewardsService: RewardsService,
    private readonly email: EmailService,
    private readonly metrics: MetricsService,
  ) {}

  /**
   * Start checkout. Items may be supplied directly OR omitted to checkout the
   * user's cart. Prices are always recomputed server-side.
   */
  async startCheckout(userId: string | null, email: string | null, input: CheckoutDto) {
    let items = input.items;
    if (!items || items.length === 0) {
      if (!userId) throw new BadRequestException("A user cart is required for guest checkout");
      const cart = await this.cartService.getCart(userId, null);
      if (cart.items.length === 0) {
        throw new BadRequestException("Cart is empty");
      }
      items = cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
    }
    try {
      const created = await this.repo.createOrderWithReservations(
        userId,
        email ?? null,
        items,
        RESERVATION_TTL_MS,
      );
      this.metrics.recordCheckoutStarted(); // §67
      this.metrics.recordInventoryReservation();
      return created;
    } catch (err: any) {
      if (err instanceof Error && err.message.startsWith("PRODUCT_NOT_FOUND")) {
        throw new NotFoundException("One or more products not found");
      }
      if (err instanceof Error && err.message === "NO_STOCK") {
        throw new BadRequestException("Product is out of stock");
      }
      if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
        throw new BadRequestException("Insufficient stock to fulfill order");
      }
      throw err;
    }
  }

  /** Confirm payment → finalize: commit inventory, create order, award rewards. */
  async pay(orderId: string, userId: string, input: PayDto) {
    const order = await this.repo.findOrderForUser(orderId, userId);
    if (!order) throw new NotFoundException("Order not found");
    try {
      const confirmed = await this.repo.finalizeOrder(
        orderId,
        `mock_${input.paymentMethod}_${Date.now().toString(36)}`,
      );
      // §67 business metrics: order created + checkout/payment completed.
      this.metrics.recordOrderCreated();
      this.metrics.recordCheckoutCompleted();
      this.metrics.recordPaymentCompleted();
      const unitsSold = (confirmed.items ?? []).reduce(
        (acc: number, it: { quantity?: number }) => acc + (Number(it.quantity) || 0),
        0,
      );
      if (unitsSold > 0) this.metrics.recordProductsSold(unitsSold);
      // Step 9: award purchase XP (idempotent per order; never fails checkout).
      if (order.userId) {
        await this.rewardsService.awardPurchaseXp(order.userId, Number(confirmed.total), orderId).catch(() => 0);
      }
      // Queue order-confirmation email (async; never blocks checkout).
      const email = order.email ?? (order.userId ? await this.repo.findUserEmail(order.userId).catch(() => null) : null);
      if (email) {
        await this.email
          .sendOrderConfirmation(email, confirmed.orderNumber ?? "PV-0", String(confirmed.total))
          .catch(() => {});
      }
      return confirmed;
    } catch (err: any) {
      if (err instanceof Error && err.message === "ORDER_NOT_FOUND") {
        throw new NotFoundException("Order not found");
      }
      if (err instanceof Error && err.message === "ORDER_NOT_PENDING") {
        throw new BadRequestException("Order is not pending payment");
      }
      if (err instanceof Error && err.message === "STOCK_LOST") {
        throw new BadRequestException("Stock changed since reservation; order requires review");
      }
      this.metrics.recordCheckoutFailed(); // §67
      this.metrics.recordPaymentFailed();
      throw err;
    }
  }

  /** Cancel: release reservations, order → CANCELLED. */
  async cancel(orderId: string, userId: string) {
    const order = await this.repo.findOrderForUser(orderId, userId);
    if (!order) throw new NotFoundException("Order not found");
    try {
      return await this.repo.cancelOrder(orderId);
    } catch (err: any) {
      if (err instanceof Error && err.message === "ORDER_NOT_CANCELLABLE") {
        throw new BadRequestException("Order cannot be cancelled in its current state");
      }
      throw err;
    }
  }

  async getOrder(orderId: string, userId: string | null) {
    const order = await this.repo.findOrderForUser(orderId, userId);
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }
}
