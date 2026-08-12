import { Controller, Get } from "@nestjs/common";
import { CartService } from "./cart.service";

@Controller("cart")
export class CartController {
  constructor(private readonly service: CartService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
