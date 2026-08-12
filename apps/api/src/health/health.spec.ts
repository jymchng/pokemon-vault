import { Test } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

it("health liveness returns ok", async () => {
  const moduleRef = await Test.createTestingModule({ controllers: [HealthController], providers: [HealthService] }).compile();
  const ctrl = moduleRef.get(HealthController);
  expect(ctrl.liveness()).toEqual({ status: "ok", service: "pokemon-vault-api" });
});
