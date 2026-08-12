import { Test } from "@nestjs/testing";
import { CollectionController } from "./collection.controller";
import { CollectionService } from "./collection.service";
import { CollectionRepository } from "./collection.repository";

it("collection: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [CollectionController],
    providers: [CollectionService, CollectionRepository],
  }).compile();
  const ctrl = moduleRef.get(CollectionController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
