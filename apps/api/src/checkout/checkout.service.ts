import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CheckoutDto, PayDto } from "./checkout.dto";
import { CheckoutRepository } from "./checkout.repository";

export const RESERVATION_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class CheckoutService {
  constructor(private readonly repo: CheckoutRepository) {}

  /**
   * Checkout: verify stock → reserve → create order (PENDING) + payment
   * (PENDING). Stock verification + reservation happen under row locks in a
   * single transaction; the DB check constraint prevents overselling.
   */
  async startCheckout(userId: string | null, email: string | null, input: CheckoutDto) {
    try {
      return await this.repo.createOrderWithReservations(
        userId,
        email ?? null,
        input.items,
        RESERVATION_TTL_MS,
      );
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

  /** Mock payment → finalize: convert reservation → sale atomically. */
  async pay(orderId: string, userId: string, input: PayDto) {
    const order = await this.repo.findOrderForUser(orderId, userId);
    if (!order) throw new NotFoundException("Order not found");
    try {
      const confirmed = await this.repo.finalizeOrder(
        orderId,
        `mock_${input.paymentMethod}_${Date.now().toString(36)}`,
      );
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
