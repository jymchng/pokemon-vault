import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles, USER_ROLES } from "../common/roles.decorator";
import { AdminService } from "./admin.service";

/**
 * Admin operations. Server-side RBAC:
 *   - GET  /admin           ADMIN or SUPER_ADMIN
 *   - GET  /admin/roles     SUPER_ADMIN only (proves hierarchy: ADMIN is denied)
 */
@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get()
  @Roles("ADMIN")
  async index() {
    // Thin controller: delegates to the service (business logic lives there).
    return { data: await this.service.list() };
  }

  @Get("roles")
  @Roles("SUPER_ADMIN")
  async roles() {
    return { data: { roles: USER_ROLES } };
  }
}
