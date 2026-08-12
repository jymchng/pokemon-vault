import { Test } from "@nestjs/testing";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UsersRepository } from "./users.repository";

it("users: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [UsersController],
    providers: [UsersService, UsersRepository],
  }).compile();
  const ctrl = moduleRef.get(UsersController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
