import { Module } from "@nestjs/common";
import { WishlistController } from "./wishlist.controller";
import { WishlistService } from "./wishlist.service";
import { WishlistRepository } from "./wishlist.repository";

@Module({
  controllers: [WishlistController],
  providers: [WishlistService, WishlistRepository],
  exports: [WishlistService],
})
export class WishlistModule {}
