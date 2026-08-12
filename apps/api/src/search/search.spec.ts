import { Test } from "@nestjs/testing";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { SearchRepository } from "./search.repository";

it("search: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [SearchController],
    providers: [SearchService, SearchRepository],
  }).compile();
  const ctrl = moduleRef.get(SearchController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
