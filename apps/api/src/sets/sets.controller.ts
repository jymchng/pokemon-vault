import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { SetsService } from "./sets.service";
import { CreateSetSchema, UpdateSetSchema } from "./sets.dto";

/**
 * Sets catalog. Public reads; STAFF+ mutations (server-side RBAC).
 *   GET    /sets             public
 *   GET    /sets/:slugOrId   public
 *   POST   /sets             STAFF+
 *   PATCH  /sets/:slugOrId   STAFF+
 *   DELETE /sets/:slugOrId   STAFF+
 */
@Controller("sets")
export class SetsController {
  constructor(private readonly service: SetsService) {}

  @Get()
  async index() {
    return { data: await this.service.list() };
  }

  @Get(":slugOrId")
  async show(@Param("slugOrId") slugOrId: string) {
    return { data: await this.service.getBySlugOrId(slugOrId) };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown) {
    const parsed = CreateSetSchema.parse(body);
    return { data: await this.service.create(parsed) };
  }

  @Patch(":slugOrId")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  async update(@Param("slugOrId") slugOrId: string, @Body() body: unknown) {
    const parsed = UpdateSetSchema.parse(body);
    return { data: await this.service.update(slugOrId, parsed) };
  }

  @Delete(":slugOrId")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("slugOrId") slugOrId: string) {
    await this.service.remove(slugOrId);
  }
}
