import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WishlistItemDto } from "./wishlist.dto";

@Injectable()
export class WishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findItems(userId: string): Promise<WishlistItemDto[]> {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: { select: { id: true, sku: true, name: true, price: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      sku: r.product.sku,
      productName: r.product.name,
      price: Number(r.product.price),
      status: r.product.status,
      createdAt: r.createdAt,
    }));
  }

  async findItem(userId: string, productId: string) {
    return this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
  }

  async addItem(userId: string, productId: string) {
    return this.prisma.wishlistItem.create({ data: { userId, productId } });
  }

  async removeItem(userId: string, productId: string) {
    return this.prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  }
}
