import { Test } from "@nestjs/testing";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";
import { CartRepository } from "./cart.repository";

it("cart: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [CartController],
    providers: [CartService, CartRepository],
  }).compile();
  const ctrl = moduleRef.get(CartController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
