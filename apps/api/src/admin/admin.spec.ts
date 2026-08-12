import { Test } from "@nestjs/testing";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminRepository } from "./admin.repository";

it("admin: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [AdminController],
    providers: [AdminService, AdminRepository],
  }).compile();
  const ctrl = moduleRef.get(AdminController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
