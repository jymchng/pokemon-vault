import { Controller, Get, Query } from "@nestjs/common";
import { SearchSchema, SearchDto } from "./search.dto";
import { SearchService } from "./search.service";

/**
 * Search (§46) — public. PostgreSQL FTS behind a swappable abstraction.
 *   GET /search?type=products&q=charizard&category=...&sort=price_asc
 *   GET /search?type=cards&q=pikachu&rarity=...&grade=PSA_10
 *
 * All filters are validated by zod; sort is whitelisted; SQL params are
 * bound (never interpolated).
 */
@Controller("search")
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  async index(@Query() query: unknown) {
    const parsed = SearchSchema.parse(query ?? {}) as SearchDto;
    return { data: await this.service.search(parsed) };
  }
}
