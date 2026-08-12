import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AddWishlistItemDto, WishlistItemDto } from "./wishlist.dto";
import { WishlistRepository } from "./wishlist.repository";

@Injectable()
export class WishlistService {
  constructor(private readonly repo: WishlistRepository) {}

  async list(userId: string): Promise<WishlistItemDto[]> {
    return this.repo.findItems(userId);
  }

  async add(userId: string, input: AddWishlistItemDto): Promise<WishlistItemDto[]> {
    const existing = await this.repo.findItem(userId, input.productId);
    if (existing) {
      throw new ConflictException("Product already in wishlist");
    }
    try {
      await this.repo.addItem(userId, input.productId);
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw new ConflictException("Product already in wishlist");
      }
      if (err?.code === "P2003") {
        throw new NotFoundException("Product not found");
      }
      throw err;
    }
    return this.repo.findItems(userId);
  }

  async remove(userId: string, productId: string): Promise<WishlistItemDto[]> {
    await this.repo.removeItem(userId, productId);
    return this.repo.findItems(userId);
  }
}
