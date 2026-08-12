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
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import {
  CreateProductSchema,
  CreateProductDto,
  ProductQuerySchema,
  ProductQueryDto,
  UpdateProductSchema,
  UpdateProductDto,
  UpdateVariantSchema,
  UpdateVariantDto,
} from "./products.dto";
import { ProductsService } from "./products.service";

/**
 * Catalog: public reads (storefront); mutations are STAFF+ (server-side RBAC).
 *   GET    /products                public (ACTIVE only, filterable/paged)
 *   GET    /products/:slugOrId      public
 *   GET    /admin/products          STAFF+ (includes DRAFT/ARCHIVED)
 *   POST   /products                STAFF+
 *   PATCH  /products/:id            STAFF+
 *   DELETE /products/:id            STAFF+ (soft delete)
 *   POST   /products/:id/variants   STAFF+
 *   PATCH  /variants/:id            STAFF+
 *   DELETE /variants/:id            STAFF+
 */
@Controller()
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get("products")
  async index(@Query() query: unknown) {
    const parsed = ProductQuerySchema.parse(query ?? {});
    return { data: await this.service.list(parsed) };
  }

  @Get("products/:slugOrId")
  async show(@Param("slugOrId") slugOrId: string) {
    return { data: await this.service.getBySlugOrId(slugOrId) };
  }

  @Get("admin/products")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  async adminIndex(@Query() query: unknown) {
    const parsed = ProductQuerySchema.parse(query ?? {});
    return { data: await this.service.listAdmin(parsed) };
  }

  @Post("products")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown) {
    const parsed = CreateProductSchema.parse(body);
    return { data: await this.service.create(parsed as CreateProductDto) };
  }

  @Patch("products/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const parsed = UpdateProductSchema.parse(body);
    return { data: await this.service.update(id, parsed as UpdateProductDto) };
  }

  @Delete("products/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.service.remove(id);
  }

  @Post("products/:id/variants")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.CREATED)
  async addVariant(@Param("id") id: string, @Body() body: unknown) {
    const parsed = UpdateVariantSchema.parse(body) as UpdateVariantDto;
    const variant = await this.service.addVariant(id, {
      ...parsed,
      sku: parsed.sku!,
      name: parsed.name!,
      price: parsed.price!,
    });
    return { data: variant };
  }

  @Patch("variants/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  async updateVariant(@Param("id") id: string, @Body() body: unknown) {
    const parsed = UpdateVariantSchema.parse(body);
    return { data: await this.service.updateVariant(id, parsed) };
  }

  @Delete("variants/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeVariant(@Param("id") id: string) {
    await this.service.removeVariant(id);
  }
}
