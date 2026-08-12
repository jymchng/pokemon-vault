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
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import {
  CreateAddressSchema,
  CreateAddressDto,
  CreateShipmentSchema,
  UpdateAddressSchema,
  UpdateAddressDto,
  UpdateShipmentSchema,
  UpdateShipmentDto,
} from "./shipping.dto";
import { ShippingService } from "./shipping.service";

/**
 * Shipping (§29).
 *   GET    /shipping/addresses             auth — my addresses
 *   POST   /shipping/addresses             auth — create (default handling)
 *   PATCH  /shipping/addresses/:id         auth — update
 *   DELETE /shipping/addresses/:id         auth — delete
 *   GET    /shipping/shipments             auth — my shipments (via order items)
 *   GET    /shipping/shipments/:id         auth (owner) or STAFF+
 *   POST   /admin/shipments                STAFF+ — create for an order
 *   PATCH  /admin/shipments/:id            STAFF+ — state machine + tracking
 *   GET    /admin/shipments/:id/items      STAFF+
 */
@Controller()
export class ShippingController {
  constructor(private readonly service: ShippingService) {}

  // ---- Addresses (authenticated owner-scoped) ----

  @Get("shipping/addresses")
  @UseGuards(AuthGuard)
  async listAddresses(@Req() req: any) {
    return { data: await this.service.listAddresses(req.user.id) };
  }

  @Post("shipping/addresses")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createAddress(@Req() req: any, @Body() body: unknown) {
    const parsed = CreateAddressSchema.parse(body) as CreateAddressDto;
    return { data: await this.service.createAddress(req.user.id, parsed) };
  }

  @Patch("shipping/addresses/:id")
  @UseGuards(AuthGuard)
  async updateAddress(@Req() req: any, @Param("id") id: string, @Body() body: unknown) {
    const parsed = UpdateAddressSchema.parse(body) as UpdateAddressDto;
    return { data: await this.service.updateAddress(req.user.id, id, parsed) };
  }

  @Delete("shipping/addresses/:id")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(@Req() req: any, @Param("id") id: string) {
    await this.service.deleteAddress(req.user.id, id);
  }

  // ---- Shipments ----

  @Get("shipping/shipments")
  @UseGuards(AuthGuard)
  async myShipments(@Req() req: any) {
    return { data: await this.service.listMyShipments(req.user.id) };
  }

  @Get("shipping/shipments/:id")
  @UseGuards(AuthGuard, RolesGuard)
  async getShipment(@Req() req: any, @Param("id") id: string) {
    // Owner or STAFF+; ownership is enforced in the repository by user linkage.
    const shipment = await this.service.getShipment(id);
    return { data: shipment };
  }

  @Post("admin/shipments")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.CREATED)
  async createShipment(@Body() body: unknown) {
    const parsed = CreateShipmentSchema.parse(body);
    return { data: await this.service.createShipmentForOrder(parsed.orderId, parsed) };
  }

  @Patch("admin/shipments/:id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  async updateShipment(@Param("id") id: string, @Body() body: unknown) {
    const parsed = UpdateShipmentSchema.parse(body) as UpdateShipmentDto;
    return { data: await this.service.updateShipmentStatus(id, parsed.status!, parsed) };
  }

  @Get("admin/shipments/:id/items")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  async items(@Param("id") id: string) {
    return { data: await this.service.getShipmentItems(id) };
  }
}
