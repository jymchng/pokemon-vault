import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdminCollectionGrantDto,
  AdminInventoryAdjustDto,
  AdminRefundDto,
  AdminRoleDto,
  AdminUserStatusDto,
} from "./admin.dto";

/**
 * Admin data access (§88): administrative operations on inventory, orders,
 * refunds, collection grants, user status/roles, rewards, cards, sets,
 * products and shipments. Every mutation returns {before, after} so the
 * service can write an audit log entry (§89) — no unnecessary sensitive data.
 */
@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Inventory ─────────────────────────────────────────────────────────────
  async adjustInventory(input: AdminInventoryAdjustDto) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new Error("ITEM_NOT_FOUND");
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.inventoryItem.update({
        where: { id: input.itemId },
        data: { quantity: { increment: input.change } },
      });
      await tx.inventoryMovement.create({
        data: {
          itemId: input.itemId,
          change: input.change,
          reason: input.reason ?? "ADMIN_ADJUST",
        },
      });
      return next;
    });
    return { before: { quantity: item.quantity }, after: { quantity: updated.quantity } };
  }

  // ── Orders / refunds ──────────────────────────────────────────────────────
  async inspectOrder(orderRef: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: orderRef }, { orderNumber: orderRef }] },
      include: { items: true, payment: true, shipments: { include: { items: true } } },
    });
    return order ? { id: order.id, orderNumber: order.orderNumber, userId: order.userId, status: order.status, total: order.total, items: order.items, payment: order.payment, shipments: order.shipments } : null;
  }

  async refund(input: AdminRefundDto) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: input.orderId }, { orderNumber: input.orderId }] },
    });
    if (!order) throw new Error("ORDER_NOT_FOUND");
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: "REFUNDED" },
    });
    return { before: { status: order.status }, after: { status: updated.status } };
  }

  // ── Collection grants ─────────────────────────────────────────────────────
  async grantCollection(input: AdminCollectionGrantDto) {
    const [user, card] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: input.userId } }),
      this.prisma.card.findUnique({ where: { id: input.cardId } }),
    ]);
    if (!user || !card) throw new Error("USER_OR_CARD_NOT_FOUND");
    const collection = await this.prisma.collection.findFirst({ where: { userId: input.userId } })
      ?? await this.prisma.collection.create({ data: { userId: input.userId } });
    const before = await this.prisma.collectionItem.findUnique({
      where: { collectionId_cardId: { collectionId: collection.id, cardId: input.cardId } },
    });
    const after = await this.prisma.collectionItem.upsert({
      where: { collectionId_cardId: { collectionId: collection.id, cardId: input.cardId } },
      create: { collectionId: collection.id, cardId: input.cardId, quantity: input.quantity },
      update: { quantity: { increment: input.quantity } },
    });
    return {
      before: { quantity: before?.quantity ?? 0 },
      after: { quantity: after.quantity },
    };
  }

  // ── User status / roles ───────────────────────────────────────────────────
  async setUserStatus(input: AdminUserStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new Error("USER_NOT_FOUND");
    const updated = await this.prisma.user.update({
      where: { id: input.userId },
      data: input.status === "DELETED" ? { status: "DELETED", deletedAt: new Date() } : { status: input.status },
    });
    return { before: { status: user.status }, after: { status: updated.status } };
  }

  async setUserRole(input: AdminRoleDto) {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new Error("USER_NOT_FOUND");
    const updated = await this.prisma.user.update({
      where: { id: input.userId },
      data: { role: input.role },
    });
    return { before: { role: user.role }, after: { role: updated.role } };
  }

  // ── Overview (dashboard) ──────────────────────────────────────────────────
  async dashboard() {
    const [products, orders, users, pendingShipments, lowStock] = await Promise.all([
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.order.count(),
      this.prisma.user.count({ where: { status: "ACTIVE" } }),
      this.prisma.shipment.count({ where: { status: { in: ["PENDING", "LABEL_CREATED"] } } }),
      this.prisma.inventoryItem.count({ where: { quantity: { lte: 5 } } }),
    ]);
    return { products, orders, users, pendingShipments, lowStock };
  }
}
