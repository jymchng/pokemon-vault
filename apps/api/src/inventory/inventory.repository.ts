import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  InventoryItemDto,
  InventoryLocationDto,
  InventoryMovementDto,
} from "./inventory.dto";

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllItems(): Promise<InventoryItemDto[]> {
    const rows = await this.prisma.inventoryItem.findMany({
      include: {
        product: { select: { id: true, sku: true, name: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      sku: r.product.sku,
      productName: r.product.name,
      locationId: r.locationId,
      locationName: r.location?.name ?? null,
      status: r.status,
      quantity: r.quantity,
      reserved: r.reserved,
      available: r.quantity - r.reserved,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async findItemById(id: string) {
    return this.prisma.inventoryItem.findUnique({
      where: { id },
      include: { product: { select: { sku: true, name: true } }, location: true },
    });
  }

  async findMovements(itemId?: string, limit = 50): Promise<InventoryMovementDto[]> {
    const rows = await this.prisma.inventoryMovement.findMany({
      where: itemId ? { itemId } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      itemId: r.itemId,
      change: r.change,
      reason: r.reason,
      orderId: r.orderId,
      createdAt: r.createdAt,
    }));
  }

  async findLocations(): Promise<InventoryLocationDto[]> {
    const rows = await this.prisma.inventoryLocation.findMany({ orderBy: { name: "asc" } });
    return rows.map((r) => ({ id: r.id, name: r.name, code: r.code }));
  }

  async createLocation(name: string, code: string): Promise<InventoryLocationDto> {
    const row = await this.prisma.inventoryLocation.create({ data: { name, code } });
    return { id: row.id, name: row.name, code: row.code };
  }

  // ---- Reservations (shared with the checkout flow) ----

  /** Expired, still-active reservations (expiresAt < now AND releasedAt IS NULL). */
  async findExpiredReservations(now: Date) {
    return this.prisma.inventoryReservation.findMany({
      where: { expiresAt: { lt: now }, releasedAt: null },
      take: 100,
    });
  }

  /** Release one reservation: reserved -= qty + RELEASE movement (guarded). */
  async releaseReservation(reservationId: string, now: Date): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.inventoryReservation.findUnique({
        where: { id: reservationId },
      });
      if (!reservation || reservation.releasedAt) return false;
      const updated = await tx.inventoryItem.updateMany({
        where: { id: reservation.itemId, reserved: { gte: reservation.quantity } },
        data: { reserved: { decrement: reservation.quantity } },
      });
      if (updated.count !== 1) return false;
      await tx.inventoryReservation.update({
        where: { id: reservationId },
        data: { releasedAt: now },
      });
      await tx.inventoryMovement.create({
        data: { itemId: reservation.itemId, change: 0, reason: "RELEASE", orderId: reservation.orderId },
      });
      return true;
    });
  }

  /** Apply a quantity delta with a movement record (single transaction, guarded). */
  async applyChange(
    itemId: string,
    delta: number,
    reason: string,
    opts: { where?: any; orderId?: string | null } = {},
  ): Promise<{ ok: boolean; item?: any }> {
    return this.prisma.$transaction(async (tx) => {
      const where: any = { id: itemId, ...(opts.where ?? {}) };
      const updated = await tx.inventoryItem.updateMany({
        where,
        data: delta >= 0
          ? { quantity: { increment: delta } }
          : { quantity: { increment: delta } },
      });
      if (updated.count !== 1) return { ok: false };
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      await tx.inventoryMovement.create({
        data: { itemId, change: delta, reason, orderId: opts.orderId ?? null },
      });
      return { ok: true, item };
    });
  }
}
