import { Controller, Get } from "@nestjs/common";
import { CardsService } from "./cards.service";

@Controller("cards")
export class CardsController {
  constructor(private readonly service: CardsService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
