import { Controller, Get } from "@nestjs/common";
import { SetsService } from "./sets.service";

@Controller("sets")
export class SetsController {
  constructor(private readonly service: SetsService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
