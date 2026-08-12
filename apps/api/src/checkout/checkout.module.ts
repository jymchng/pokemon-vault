import { Module } from "@nestjs/common";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { CheckoutRepository } from "./checkout.repository";

@Module({
  controllers: [CheckoutController],
  providers: [CheckoutService, CheckoutRepository],
  exports: [CheckoutService],
})
export class CheckoutModule {}
