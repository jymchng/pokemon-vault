import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import {
  CreateLocationSchema,
  DamageSchema,
  RestockSchema,
} from "./inventory.dto";
import { InventoryService } from "./inventory.service";

/**
 * Inventory (STAFF+ mutations, server-side RBAC).
 *   GET  /inventory                          STAFF+ list items (available/reserved)
 *   GET  /inventory/movements                STAFF+ movement ledger
 *   GET  /inventory/locations                STAFF+
 *   POST /inventory/locations                STAFF+
 *   POST /inventory/:itemId/restock          STAFF+
 *   POST /inventory/:itemId/damage           STAFF+
 *   POST /inventory/reservations/release-expired  STAFF+ (also runs on a timer)
 */
@Controller("inventory")
@UseGuards(AuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @Roles("STAFF")
  async index() {
    return { data: await this.service.listItems() };
  }

  @Get("movements")
  @Roles("STAFF")
  async movements(@Query("itemId") itemId?: string) {
    return { data: await this.service.listMovements(itemId) };
  }

  @Get("locations")
  @Roles("STAFF")
  async locations() {
    return { data: await this.service.listLocations() };
  }

  @Post("locations")
  @Roles("STAFF")
  @HttpCode(HttpStatus.CREATED)
  async createLocation(@Body() body: unknown) {
    const parsed = CreateLocationSchema.parse(body);
    return { data: await this.service.createLocation(parsed) };
  }

  @Post(":itemId/restock")
  @Roles("STAFF")
  async restock(@Param("itemId") itemId: string, @Body() body: unknown) {
    const parsed = RestockSchema.parse(body);
    return { data: await this.service.restock(itemId, parsed) };
  }

  @Post(":itemId/damage")
  @Roles("STAFF")
  async damage(@Param("itemId") itemId: string, @Body() body: unknown) {
    const parsed = DamageSchema.parse(body);
    return { data: await this.service.damage(itemId, parsed) };
  }

  @Post("reservations/release-expired")
  @Roles("STAFF")
  async releaseExpired() {
    const released = await this.service.releaseExpiredReservations();
    return { data: { released } };
  }
}
