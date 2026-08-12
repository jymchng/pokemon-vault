import { Test } from "@nestjs/testing";
import { PacksController } from "./packs.controller";
import { PacksService } from "./packs.service";
import { PacksRepository } from "./packs.repository";

it("packs: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [PacksController],
    providers: [PacksService, PacksRepository],
  }).compile();
  const ctrl = moduleRef.get(PacksController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
