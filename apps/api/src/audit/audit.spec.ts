import { Test } from "@nestjs/testing";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { AuditRepository } from "./audit.repository";

it("audit: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [AuditController],
    providers: [AuditService, AuditRepository],
  }).compile();
  const ctrl = moduleRef.get(AuditController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
