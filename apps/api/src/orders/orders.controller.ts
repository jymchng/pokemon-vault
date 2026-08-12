import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import {
  OrderQuerySchema,
  OrderQueryDto,
  UpdateOrderStatusSchema,
  UpdateOrderStatusDto,
} from "./orders.dto";
import { OrdersService } from "./orders.service";

/**
 * Orders.
 *   GET  /orders                  authenticated owner list (paged, status filter)
 *   GET  /orders/:orderNumber     owner or STAFF+ (IDOR-safe)
 *   GET  /admin/orders            STAFF+ list (all users)
 *   PATCH /admin/orders/:orderNumber/status  STAFF+ (validated state machine)
 */
@Controller()
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get("orders")
  @UseGuards(AuthGuard)
  async index(@Req() req: any, @Query() query: unknown) {
    const parsed = OrderQuerySchema.parse(query ?? {}) as OrderQueryDto;
    return { data: await this.service.listForUser(req.user.id, parsed) };
  }

  @Get("orders/:orderNumber")
  @UseGuards(AuthGuard, RolesGuard)
  async show(@Req() req: any, @Param("orderNumber") orderNumber: string) {
    return { data: await this.service.getForUser(orderNumber, req.user.id, req.user.role ?? "CUSTOMER") };
  }

  @Get("admin/orders")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  async adminIndex(@Query() query: unknown) {
    const parsed = OrderQuerySchema.parse(query ?? {}) as OrderQueryDto;
    return { data: await this.service.listAll(parsed) };
  }

  @Patch("admin/orders/:orderNumber/status")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  async updateStatus(@Param("orderNumber") orderNumber: string, @Body() body: unknown) {
    const parsed = UpdateOrderStatusSchema.parse(body) as UpdateOrderStatusDto;
    return { data: await this.service.updateStatusForAdmin(orderNumber, parsed) };
  }
}
