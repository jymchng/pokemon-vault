import { Test } from "@nestjs/testing";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsRepository } from "./notifications.repository";

it("notifications: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsRepository],
  }).compile();
  const ctrl = moduleRef.get(NotificationsController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
