import { Controller, Get } from "@nestjs/common";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
