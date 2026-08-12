import { Controller, Get } from "@nestjs/common";
import { ShippingService } from "./shipping.service";

@Controller("shipping")
export class ShippingController {
  constructor(private readonly service: ShippingService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
