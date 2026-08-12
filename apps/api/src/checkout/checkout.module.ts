import { Module } from "@nestjs/common";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { CheckoutRepository } from "./checkout.repository";
import { PaymentsModule } from "../payments/payments.module";
import { EmailModule } from "../email/email.module";
import { RewardsModule } from "../rewards/rewards.module";
import { CartModule } from "../cart/cart.module";

@Module({
  imports: [PaymentsModule, RewardsModule, CartModule, EmailModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, CheckoutRepository],
  exports: [CheckoutService],
})
export class CheckoutModule {}
