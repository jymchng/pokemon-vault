import { Test } from "@nestjs/testing";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";
import { AuditRepository } from "./audit.repository";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";

const passGuard = { canActivate: () => true };

class FakeAuditRepository {
  rows: any[] = [];
  async create(entry: any) { this.rows.push(entry); }
  async findAll(opts: any) {
    return { items: this.rows.slice(0, opts.limit), total: this.rows.length };
  }
}

it("audit: service list returns entries from the repository", async () => {
  const repo = new FakeAuditRepository();
  const moduleRef = await Test.createTestingModule({
    controllers: [AuditController],
    providers: [AuditService, { provide: AuditRepository, useValue: repo }],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .overrideGuard(RolesGuard)
    .useValue(passGuard)
    .compile();
  const ctrl = moduleRef.get(AuditController);
  const svc = moduleRef.get(AuditService);
  await svc.record({ action: "inventory.adjust", resourceType: "InventoryItem", resourceId: "i1", after: { quantity: 3 } });
  const res: any = await ctrl.index({});
  expect(res.data.total).toBe(1);
  expect(res.data.items[0].action).toBe("inventory.adjust");
});
