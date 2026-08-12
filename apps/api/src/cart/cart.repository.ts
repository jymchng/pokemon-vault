import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CartDto, CartItemDto } from "./cart.dto";

/** Snapshot helper: quantity/cartId/productId row + product + inventory available. */
function mapItem(row: any): CartItemDto {
  const unitPrice = Number(row.product.price);
  return {
    id: row.id,
    productId: row.productId,
    sku: row.product.sku,
    productName: row.product.name,
    quantity: row.quantity,
    unitPrice,
    lineTotal: +(unitPrice * row.quantity).toFixed(2),
    available: row.product.inventoryItems?.[0]
      ? Number(row.product.inventoryItems[0].quantity) - Number(row.product.inventoryItems[0].reserved)
      : 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapCart(row: any): CartDto {
  const items: CartItemDto[] = (row.items ?? []).map(mapItem);
  return {
    id: row.id,
    userId: row.userId,
    sessionId: row.sessionId,
    items,
    subtotal: +items.reduce((s: number, i: CartItemDto) => s + i.lineTotal, 0).toFixed(2),
    itemCount: items.reduce((s: number, i: CartItemDto) => s + i.quantity, 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Get-or-create the cart for a user or an anonymous session. */
  async getOrCreateCart(owner: { userId?: string | null; sessionId?: string | null }) {
    const where = owner.userId
      ? { userId: owner.userId }
      : { sessionId: owner.sessionId ?? null };
    if (!where.userId && !where.sessionId) throw new Error("NO_OWNER");
    return this.prisma.cart.upsert({
      where: where as any,
      update: {},
      create: {
        userId: owner.userId ?? null,
        sessionId: owner.userId ? null : owner.sessionId ?? null,
      },
    });
  }

  async findCart(id: string) {
    return this.prisma.cart.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                price: true,
                status: true,
                deletedAt: true,
                inventoryItems: {
                  where: { status: "AVAILABLE" },
                  select: { quantity: true, reserved: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
  }

  /** Product + availability (ACTIVE, not deleted, available stock). */
  async findProductWithStock(productId: string) {
    return this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null, status: "ACTIVE" },
      select: {
        id: true,
        sku: true,
        name: true,
        price: true,
        inventoryItems: {
          where: { status: "AVAILABLE" },
          select: { quantity: true, reserved: true },
          take: 1,
        },
      },
    });
  }

  async addItem(cartId: string, productId: string, quantity: number) {
    return this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      update: { quantity: { increment: quantity } },
      create: { cartId, productId, quantity },
    });
  }

  async updateItemQuantity(cartId: string, productId: string, quantity: number) {
    return this.prisma.cartItem.updateMany({
      where: { cartId, productId },
      data: { quantity },
    });
  }

  async removeItem(cartId: string, productId: string) {
    return this.prisma.cartItem.deleteMany({ where: { cartId, productId } });
  }

  async clearCart(cartId: string) {
    return this.prisma.cartItem.deleteMany({ where: { cartId } });
  }

  /** Claim an anonymous cart for a user on login (merge/ownership). */
  async adoptSessionCart(sessionId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sessionCart = await tx.cart.findUnique({ where: { sessionId } });
      const userCart = await tx.cart.findUnique({ where: { userId } });
      if (!sessionCart) return;
      if (!userCart) {
        await tx.cart.update({ where: { id: sessionCart.id }, data: { sessionId: null, userId } });
        return;
      }
      // Merge items (sum quantities, keep user cart).
      const sessionItems = await tx.cartItem.findMany({ where: { cartId: sessionCart.id } });
      for (const item of sessionItems) {
        await tx.cartItem.upsert({
          where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
          update: { quantity: { increment: item.quantity } },
          create: { cartId: userCart.id, productId: item.productId, quantity: item.quantity },
        });
      }
      await tx.cart.delete({ where: { id: sessionCart.id } });
    });
  }

  async loadCartFor(owner: { userId?: string | null; sessionId?: string | null }) {
    const cart = await this.getOrCreateCart(owner);
    const full = await this.findCart(cart.id);
    return full ? mapCart(full) : null;
  }
}
