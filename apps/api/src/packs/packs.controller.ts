import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { OpenPackSchema, OpenPackDto } from "./packs.dto";
import { Throttle } from "@nestjs/throttler";
import { PacksService } from "./packs.service";

/**
 * Packs (§34-37).
 *   GET  /packs                 public — list packs
 *   GET  /packs/:slugOrId       public — pack detail
 *   POST /packs/:slugOrId/open  auth — server-determined opening (client sends
 *                               only { idempotencyKey }; NEVER the cards)
 *   GET  /packs/openings/me     auth — my immutable opening history
 *   GET  /packs/openings/:id    auth — opening detail (owner only, IDOR-safe)
 */
@Controller("packs")
export class PacksController {
  constructor(private readonly service: PacksService) {}

  @Get()
  async index() {
    return { data: await this.service.list() };
  }

  @Get("openings/me")
  @UseGuards(AuthGuard)
  async myOpenings(@Req() req: any) {
    return { data: await this.service.myOpenings(req.user.id) };
  }

  @Get("openings/:id")
  @UseGuards(AuthGuard)
  async getOpening(@Req() req: any, @Param("id") id: string) {
    return { data: await this.service.getOpening(id, req.user.id) };
  }

  @Get(":slugOrId")
  async show(@Param("slugOrId") slugOrId: string) {
    return { data: await this.service.getBySlugOrId(slugOrId) };
  }

  @Post(":slugOrId/open")
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async open(@Req() req: any, @Param("slugOrId") slugOrId: string, @Body() body: unknown) {
    const parsed = OpenPackSchema.parse(body) as OpenPackDto;
    return { data: await this.service.open(slugOrId, req.user.id, parsed) };
  }
}
