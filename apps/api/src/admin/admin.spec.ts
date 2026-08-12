import { Test } from "@nestjs/testing";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminRepository } from "./admin.repository";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";

const passGuard = { canActivate: () => true };

it("admin: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [AdminController],
    providers: [AdminService, AdminRepository],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .overrideGuard(RolesGuard)
    .useValue(passGuard)
    .compile();
  const ctrl = moduleRef.get(AdminController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
