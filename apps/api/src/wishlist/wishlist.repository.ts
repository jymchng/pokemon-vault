import { Injectable } from "@nestjs/common";
import { WishlistDto } from "./wishlist.dto";

@Injectable()
export class WishlistRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<WishlistDto[]> {
    return [];
  }
}
