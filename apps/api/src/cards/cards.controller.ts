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
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import {
  CardQuerySchema,
  CardQueryDto,
  CreateCardSchema,
  CreateCardDto,
  CreateCardGradeSchema,
  CreateCardGradeDto,
  UpdateCardSchema,
  UpdateCardDto,
  UpdateCardGradeSchema,
  UpdateCardGradeDto,
  LinkProductSchema,
  LinkProductDto,
} from "./cards.dto";
import { CardsService } from "./cards.service";

/**
 * Cards catalog. Public reads; STAFF+ mutations (server-side RBAC).
 *   GET   /cards                    public (filters: setName/setId/setSlug/rarity/type/language/search + paging)
 *   GET   /cards/:id                public (includes linked card products w/ sku/price/inventory)
 *   POST  /cards                    STAFF+
 *   PATCH /cards/:id                STAFF+
 *   DELETE /cards/:id               STAFF+ (soft delete)
 *   POST  /cards/:id/products       STAFF+ (link a card product to this card)
 *   DELETE /cards/:id/products/:pid STAFF+ (unlink)
 */
@Controller("cards")
export class CardsController {
  constructor(private readonly service: CardsService) {}

  @Get()
  @ApiOperation({ summary: "List cards (cursor pagination, §86)" })
  @ApiQuery({ name: "limit", required: false, schema: { type: "integer", default: 24, maximum: 100 } })
  @ApiQuery({ name: "cursor", required: false, description: "Opaque cursor from meta.nextCursor" })
  @ApiQuery({ name: "set", required: false })
  @ApiQuery({ name: "rarity", required: false })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "language", required: false })
  @ApiQuery({ name: "search", required: false })
  async index(@Query() query: unknown) {
    const parsed = CardQuerySchema.parse(query ?? {});
    return { data: await this.service.list(parsed) };
  }

  @Get(":id")
  async show(@Param("id") id: string) {
    return { data: await this.service.getById(id, true) };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown) {
    const parsed = CreateCardSchema.parse(body);
    return { data: await this.service.create(parsed as CreateCardDto) };
  }

  @Patch(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const parsed = UpdateCardSchema.parse(body);
    return { data: await this.service.update(id, parsed as UpdateCardDto) };
  }

  @Delete(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.service.remove(id);
  }

  @Post(":id/products")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.CREATED)
  async linkProduct(@Param("id") id: string, @Body() body: unknown) {
    const parsed = LinkProductSchema.parse(body) as LinkProductDto;
    await this.service.linkProduct(id, parsed.productId);
    return { data: { linked: true } };
  }

  @Delete(":id/products/:productId")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkProduct(@Param("id") id: string, @Param("productId") productId: string) {
    await this.service.unlinkProduct(id, productId);
  }

  // ---- Grading (§17) ----

  @Get(":id/grades")
  async listGrades(@Param("id") id: string) {
    return { data: await this.service.listGrades(id) };
  }

  @Post(":id/grades")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.CREATED)
  async addGrade(@Param("id") id: string, @Body() body: unknown) {
    const parsed = CreateCardGradeSchema.parse(body);
    return { data: await this.service.addGrade(id, parsed as CreateCardGradeDto) };
  }

  @Patch("grades/:gradeId")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  async updateGrade(@Param("gradeId") gradeId: string, @Body() body: unknown) {
    const parsed = UpdateCardGradeSchema.parse(body);
    return { data: await this.service.updateGrade(gradeId, parsed as UpdateCardGradeDto) };
  }

  @Delete("grades/:gradeId")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeGrade(@Param("gradeId") gradeId: string) {
    await this.service.removeGrade(gradeId);
  }
}
