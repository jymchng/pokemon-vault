import { Injectable } from "@nestjs/common";
import { WishlistRepository } from "./wishlist.repository";
import { WishlistDto } from "./wishlist.dto";

@Injectable()
export class WishlistService {
  constructor(private readonly repo: WishlistRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<WishlistDto[]> {
    return this.repo.findAll();
  }
}
