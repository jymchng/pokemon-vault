import { Test } from "@nestjs/testing";
import { SetsController } from "./sets.controller";
import { SetsService } from "./sets.service";
import { SetsRepository } from "./sets.repository";

it("sets: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [SetsController],
    providers: [SetsService, SetsRepository],
  }).compile();
  const ctrl = moduleRef.get(SetsController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
