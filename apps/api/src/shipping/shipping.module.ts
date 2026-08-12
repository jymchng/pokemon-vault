import { Module } from "@nestjs/common";
import { ShippingController } from "./shipping.controller";
import { ShippingService } from "./shipping.service";
import { ShippingRepository } from "./shipping.repository";

@Module({
  controllers: [ShippingController],
  providers: [ShippingService, ShippingRepository],
  exports: [ShippingService],
})
export class ShippingModule {}
