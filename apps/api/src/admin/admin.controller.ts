import { Controller, Get } from "@nestjs/common";
import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
