import { Controller, Get } from "@nestjs/common";
import { PacksService } from "./packs.service";

@Controller("packs")
export class PacksController {
  constructor(private readonly service: PacksService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
