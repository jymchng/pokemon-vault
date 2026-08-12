import { Test } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";

it("auth: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [AuthService, AuthRepository],
  }).compile();
  const ctrl = moduleRef.get(AuthController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
