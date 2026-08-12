import { Controller, Get } from "@nestjs/common";
import { RewardsService } from "./rewards.service";

@Controller("rewards")
export class RewardsController {
  constructor(private readonly service: RewardsService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
