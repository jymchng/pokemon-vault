import { Test } from "@nestjs/testing";
import { ShippingController } from "./shipping.controller";
import { ShippingService } from "./shipping.service";
import { ShippingRepository } from "./shipping.repository";

it("shipping: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [ShippingController],
    providers: [ShippingService, ShippingRepository],
  }).compile();
  const ctrl = moduleRef.get(ShippingController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
