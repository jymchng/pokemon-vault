import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderDto, OrderQueryDto, UpdateOrderStatusDto } from "./orders.dto";
import { OrderListResult, OrdersRepository } from "./orders.repository";

/** Allowed forward transitions for the order state machine. */
const TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED", "PARTIALLY_REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ["REFUNDED"],
};

@Injectable()
export class OrdersService {
  constructor(private readonly repo: OrdersRepository) {}

  /** Owner sees only their own orders. */
  async listForUser(userId: string, query: OrderQueryDto): Promise<OrderListResult> {
    return this.repo.findForUser(userId, query);
  }

  /** Staff/admin sees everything. */
  async listAll(query: OrderQueryDto): Promise<OrderListResult> {
    return this.repo.findAll(query);
  }

  /** Owner or staff+ may view an order (IDOR-safe). */
  async getForUser(ref: string, userId: string, role: string): Promise<OrderDto> {
    const order = await this.repo.findByRef(ref);
    if (!order) throw new NotFoundException("Order not found");
    if (order.userId !== userId && !["STAFF", "ADMIN", "SUPER_ADMIN"].includes(role)) {
      throw new ForbiddenException("Cannot view another user's order");
    }
    return order;
  }

  /** Staff+ transition with state-machine validation. */
  async updateStatusForAdmin(ref: string, input: UpdateOrderStatusDto): Promise<OrderDto> {
    const order = await this.repo.findByRef(ref);
    if (!order) throw new NotFoundException("Order not found");
    const allowed = TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new ForbiddenException(`Cannot transition ${order.status} -> ${input.status}`);
    }
    const updated = await this.repo.updateStatus(order.id, input.status);
    if (!updated) throw new NotFoundException("Order not found");
    return updated;
  }
}
