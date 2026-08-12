import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles, USER_ROLES } from "../common/roles.decorator";
import { AdminService } from "./admin.service";
import {
  AdminCollectionGrantDto,
  AdminCollectionGrantSchema,
  AdminInventoryAdjustDto,
  AdminInventoryAdjustSchema,
  AdminRefundDto,
  AdminRefundSchema,
  AdminRoleDto,
  AdminRoleSchema,
  AdminUserStatusDto,
  AdminUserStatusSchema,
} from "./admin.dto";

/**
 * Admin API (§88). Server-side RBAC (ADMIN/SUPER_ADMIN; SUPER_ADMIN-only for
 * role changes). Every mutation writes an audit log entry (§89).
 *   GET  /admin                       dashboard counts
 *   GET  /admin/roles                 SUPER_ADMIN
 *   GET  /admin/orders/:ref           inspect order + items + payment + shipments
 *   POST /admin/refunds               refund an order
 *   POST /admin/inventory/adjust      adjust inventory + movement record
 *   POST /admin/collection/grant      grant collection items to a user
 *   PATCH /admin/users/:id/status     suspend/delete a user
 *   PATCH /admin/users/:id/role       SUPER_ADMIN role change
 */
@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get()
  @Roles("ADMIN")
  async index() {
    return { data: await this.service.dashboard() };
  }

  @Get("roles")
  @Roles("SUPER_ADMIN")
  async roles() {
    return { data: { roles: USER_ROLES } };
  }

  @Get("orders/:ref")
  @Roles("ADMIN")
  async inspectOrder(@Param("ref") ref: string) {
    return { data: await this.service.inspectOrder(ref) };
  }

  @Post("refunds")
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  async refund(@Body() body: unknown, @Req() req: any) {
    const parsed = AdminRefundSchema.parse(body) as AdminRefundDto;
    return { data: await this.service.refund(req, parsed) };
  }

  @Post("inventory/adjust")
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  async adjustInventory(@Body() body: unknown, @Req() req: any) {
    const parsed = AdminInventoryAdjustSchema.parse(body) as AdminInventoryAdjustDto;
    return { data: await this.service.adjustInventory(req, parsed) };
  }

  @Post("collection/grant")
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  async grantCollection(@Body() body: unknown, @Req() req: any) {
    const parsed = AdminCollectionGrantSchema.parse(body) as AdminCollectionGrantDto;
    return { data: await this.service.grantCollection(req, parsed) };
  }

  @Patch("users/:id/status")
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  async setUserStatus(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const parsed = AdminUserStatusSchema.parse({ ...(body as object), userId: id }) as AdminUserStatusDto;
    return { data: await this.service.setUserStatus(req, parsed) };
  }

  @Patch("users/:id/role")
  @Roles("SUPER_ADMIN")
  @HttpCode(HttpStatus.OK)
  async setUserRole(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const parsed = AdminRoleSchema.parse({ ...(body as object), userId: id }) as AdminRoleDto;
    return { data: await this.service.setUserRole(req, parsed) };
  }
}
