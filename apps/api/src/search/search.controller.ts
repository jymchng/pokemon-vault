import { Controller, Get } from "@nestjs/common";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
