import { Test } from "@nestjs/testing";
import { WishlistController } from "./wishlist.controller";
import { WishlistService } from "./wishlist.service";
import { WishlistRepository } from "./wishlist.repository";

it("wishlist: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [WishlistController],
    providers: [WishlistService, WishlistRepository],
  }).compile();
  const ctrl = moduleRef.get(WishlistController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
