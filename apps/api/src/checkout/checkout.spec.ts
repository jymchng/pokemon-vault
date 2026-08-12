import { Test } from "@nestjs/testing";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { CheckoutRepository } from "./checkout.repository";

it("checkout: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [CheckoutController],
    providers: [CheckoutService, CheckoutRepository],
  }).compile();
  const ctrl = moduleRef.get(CheckoutController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
