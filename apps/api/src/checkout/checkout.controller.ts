import { Controller, Get } from "@nestjs/common";
import { CheckoutService } from "./checkout.service";

@Controller("checkout")
export class CheckoutController {
  constructor(private readonly service: CheckoutService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
