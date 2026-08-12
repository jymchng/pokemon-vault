import { Test } from "@nestjs/testing";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaymentsRepository } from "./payments.repository";

it("payments: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [PaymentsController],
    providers: [PaymentsService, PaymentsRepository],
  }).compile();
  const ctrl = moduleRef.get(PaymentsController);
  expect(await ctrl.index()).toEqual({ data: [] });
});
