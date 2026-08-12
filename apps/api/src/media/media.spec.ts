import { Test } from "@nestjs/testing";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { MediaRepository } from "./media.repository";

it("media: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [MediaController],
    providers: [MediaService, MediaRepository],
  }).compile();
  const ctrl = moduleRef.get(MediaController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
