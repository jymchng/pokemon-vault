import { Controller, Get } from "@nestjs/common";
import { MediaService } from "./media.service";

@Controller("media")
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Get()
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }
}
