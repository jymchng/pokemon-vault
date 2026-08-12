import { Controller, Get } from "@nestjs/common";
import { AuditService } from "./audit.service";

@Controller("audit")
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
