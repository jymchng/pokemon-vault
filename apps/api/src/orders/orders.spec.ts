import { Test } from "@nestjs/testing";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrdersRepository } from "./orders.repository";

it("orders: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [OrdersController],
    providers: [OrdersService, OrdersRepository],
  }).compile();
  const ctrl = moduleRef.get(OrdersController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
