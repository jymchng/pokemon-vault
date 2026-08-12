import { Test } from "@nestjs/testing";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminRepository } from "./admin.repository";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { AuditService } from "../audit/audit.service";

const passGuard = { canActivate: () => true };
const fakeRepo = { dashboard: async () => ({ products: 0, orders: 0, users: 0, pendingShipments: 0, lowStock: 0 }) };

it("admin: service dashboard returns counts", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [AdminController],
    providers: [
      AdminService,
      { provide: AdminRepository, useValue: fakeRepo },
      { provide: AuditService, useValue: { record: async () => {} } },
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .overrideGuard(RolesGuard)
    .useValue(passGuard)
    .compile();
  const ctrl = moduleRef.get(AdminController);
  expect(await ctrl.index()).toEqual({
    data: { products: 0, orders: 0, users: 0, pendingShipments: 0, lowStock: 0 },
  });
});
