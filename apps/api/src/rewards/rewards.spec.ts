import { Test } from "@nestjs/testing";
import { RewardsController } from "./rewards.controller";
import { RewardsService } from "./rewards.service";
import { RewardsRepository } from "./rewards.repository";

it("rewards: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [RewardsController],
    providers: [RewardsService, RewardsRepository],
  }).compile();
  const ctrl = moduleRef.get(RewardsController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
