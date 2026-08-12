import { Controller, Get } from "@nestjs/common";
import { WishlistService } from "./wishlist.service";

@Controller("wishlist")
export class WishlistController {
  constructor(private readonly service: WishlistService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
