import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CheckoutItemDto } from "./checkout.dto";

export interface ReservationLine {
  productId: string;
  sku: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface CheckoutResult {
  order: any;
  reservations: Array<{ reservationId: string; itemId: string; sku: string; quantity: number; expiresAt: Date }>;
}

@Injectable()
export class CheckoutRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Full checkout pre-step: verify stock → reserve → create order + items +
   * payment, all in ONE transaction with SELECT ... FOR UPDATE row locks on
   * every inventory item (prevents overselling under concurrency). The DB
   * CHECK (quantity >= reserved) is the final backstop.
   */
  async createOrderWithReservations(
    userId: string | null,
    email: string | null,
    items: CheckoutItemDto[],
    reservationTtlMs: number,
  ): Promise<CheckoutResult> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Load products + lock inventory rows (FOR UPDATE).
      const lines: ReservationLine[] = [];
      for (const line of items) {
        const product = await tx.product.findUnique({
          where: { id: line.productId, deletedAt: null, status: "ACTIVE" },
          select: { id: true, sku: true, name: true, price: true },
        });
        if (!product) throw new Error("PRODUCT_NOT_FOUND");
        const itemRows: Array<{ id: string; quantity: number; reserved: number }> =
          await tx.$queryRawUnsafe(
            `SELECT id, "quantity", "reserved" FROM "InventoryItem" WHERE "productId" = $1 AND "status" = 'AVAILABLE' FOR UPDATE`,
            product.id,
          );
        const item = itemRows[0];
        if (!item) throw new Error("NO_STOCK");
        const available = Number(item.quantity) - Number(item.reserved);
        if (available < line.quantity) throw new Error("INSUFFICIENT_STOCK");
        lines.push({
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          unitPrice: Number(product.price),
          quantity: line.quantity,
        });
      }

      // 2. Create order (PENDING) + items.
      const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
      const order = await tx.order.create({
        data: {
          orderNumber: `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          userId,
          email,
          status: "PENDING",
          subtotal,
          total: subtotal,
          currency: "USD",
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              productName: l.productName,
              sku: l.sku,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // 3. Reserve stock: reserved += qty, RESERVE movement, reservation row.
      const expiresAt = new Date(Date.now() + reservationTtlMs);
      const reservations: CheckoutResult["reservations"] = [];
      for (const l of lines) {
        const itemRow = await tx.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM "InventoryItem" WHERE "productId" = $1 AND "status" = 'AVAILABLE' LIMIT 1`,
          l.productId,
        );
        const itemId = itemRow[0].id;
        await tx.inventoryItem.update({
          where: { id: itemId },
          data: { reserved: { increment: l.quantity } },
        });
        const reservation = await tx.inventoryReservation.create({
          data: { itemId, orderId: order.id, quantity: l.quantity, expiresAt },
        });
        await tx.inventoryMovement.create({
          data: { itemId, change: 0, reason: "RESERVE", orderId: order.id },
        });
        reservations.push({
          reservationId: reservation.id,
          itemId,
          sku: l.sku,
          quantity: l.quantity,
          expiresAt,
        });
      }

      // 4. Payment record (PENDING; provider is a test/stripe abstraction).
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: "test",
          amount: subtotal,
          currency: "USD",
          status: "PENDING",
          idempotencyKey: `chk_${order.id}`,
        },
      });

      return { order, reservations };
    });
  }

  /**
   * Finalize: after (mock) payment succeeds, convert each reservation to a
   * sale — quantity -= qty, reserved -= qty, SALE movement, order CONFIRMED,
   * payment SUCCEEDED — atomically.
   */
  async finalizeOrder(orderId: string, providerRef: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { reservations: true },
      });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (order.status !== "PENDING") throw new Error("ORDER_NOT_PENDING");

      for (const r of order.reservations) {
        if (r.releasedAt) continue;
        const updated = await tx.inventoryItem.updateMany({
          where: { id: r.itemId, quantity: { gte: r.quantity }, reserved: { gte: r.quantity } },
          data: {
            quantity: { decrement: r.quantity },
            reserved: { decrement: r.quantity },
          },
        });
        if (updated.count !== 1) throw new Error("STOCK_LOST");
        await tx.inventoryReservation.update({
          where: { id: r.id },
          data: { releasedAt: new Date() },
        });
        await tx.inventoryMovement.create({
          data: { itemId: r.itemId, change: -r.quantity, reason: "SALE", orderId },
        });
      }

      // Mark payment succeeded FIRST, then read the order so the response
      // reflects the final state (avoids a stale payment object).
      await tx.payment.updateMany({
        where: { orderId },
        data: { status: "SUCCEEDED", providerRef },
      });
      const confirmed = await tx.order.update({
        where: { id: orderId },
        data: { status: "CONFIRMED" },
        include: { items: true, payment: true },
      });
      return confirmed;
    });
  }

  /** Cancel: release every active reservation for the order, order -> CANCELLED. */
  async cancelOrder(orderId: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { reservations: true },
      });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (!["PENDING"].includes(order.status)) throw new Error("ORDER_NOT_CANCELLABLE");

      for (const r of order.reservations) {
        if (r.releasedAt) continue;
        await tx.inventoryItem.updateMany({
          where: { id: r.itemId, reserved: { gte: r.quantity } },
          data: { reserved: { decrement: r.quantity } },
        });
        await tx.inventoryReservation.update({
          where: { id: r.id },
          data: { releasedAt: new Date() },
        });
        await tx.inventoryMovement.create({
          data: { itemId: r.itemId, change: 0, reason: "RELEASE", orderId },
        });
      }
      return tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
        include: { items: true, payment: true },
      });
    });
  }

  async findOrderForUser(orderId: string, userId: string | null) {
    return this.prisma.order.findFirst({
      where: { id: orderId, ...(userId ? { userId } : {}) },
      include: { items: true, payment: true, reservations: true },
    });
  }
}
