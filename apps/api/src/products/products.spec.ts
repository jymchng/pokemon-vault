import { Test } from "@nestjs/testing";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { ProductsRepository } from "./products.repository";

it("products: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [ProductsController],
    providers: [ProductsService, ProductsRepository],
  }).compile();
  const ctrl = moduleRef.get(ProductsController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
