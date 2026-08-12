import { Test } from "@nestjs/testing";
import { CardsController } from "./cards.controller";
import { CardsService } from "./cards.service";
import { CardsRepository } from "./cards.repository";

it("cards: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [CardsController],
    providers: [CardsService, CardsRepository],
  }).compile();
  const ctrl = moduleRef.get(CardsController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
