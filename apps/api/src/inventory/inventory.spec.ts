import { Test } from "@nestjs/testing";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { InventoryRepository } from "./inventory.repository";

it("inventory: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [InventoryController],
    providers: [InventoryService, InventoryRepository],
  }).compile();
  const ctrl = moduleRef.get(InventoryController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
