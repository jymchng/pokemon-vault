import { Controller, Get } from "@nestjs/common";
import { CollectionService } from "./collection.service";

@Controller("collection")
export class CollectionController {
  constructor(private readonly service: CollectionService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
