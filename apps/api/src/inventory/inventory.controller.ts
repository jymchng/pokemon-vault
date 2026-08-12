import { Controller, Get } from "@nestjs/common";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
