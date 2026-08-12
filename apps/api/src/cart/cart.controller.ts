import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { OptionalAuthGuard } from "../auth/optional-auth.guard";
import {
  AddItemDto,
  AddItemSchema,
  UpdateItemDto,
  UpdateItemSchema,
} from "./cart.dto";
import { CartService } from "./cart.service";

/**
 * Cart (anonymous session OR authenticated user).
 *   GET    /cart/items                cart with server-priced items
 *   POST   /cart/items                add (validates stock + server price)
 *   PATCH  /cart/items/:productId     set quantity (validates stock)
 *   DELETE /cart/items/:productId     remove a line
 *   DELETE /cart/items                clear cart
 *
 * Authentication is OPTIONAL: an authenticated user's cart is keyed by
 * userId; otherwise the client supplies X-Session-Id for a guest cart.
 * Client-supplied prices are never used — every price comes from Product.
 */
@Controller("cart")
export class CartController {
  constructor(private readonly service: CartService) {}

  private resolveOwner(req: any): { userId: string | null; sessionId: string | null } {
    const userId = req.user?.id ?? null;
    const sessionId =
      typeof req.headers["x-session-id"] === "string" ? req.headers["x-session-id"] : null;
    return { userId, sessionId };
  }

  @Get("items")
  @UseGuards(OptionalAuthGuard)
  async getItems(@Req() req: any) {
    const owner = this.resolveOwner(req);
    return { data: await this.service.getCart(owner.userId, owner.sessionId) };
  }

  @Post("items")
  @UseGuards(OptionalAuthGuard)
  async addItem(@Req() req: any, @Body() body: unknown) {
    const parsed = AddItemSchema.parse(body) as AddItemDto;
    const owner = this.resolveOwner(req);
    return { data: await this.service.addItem(owner.userId, owner.sessionId, parsed) };
  }

  @Patch("items/:productId")
  @UseGuards(OptionalAuthGuard)
  async updateItem(@Req() req: any, @Param("productId") productId: string, @Body() body: unknown) {
    const parsed = UpdateItemSchema.parse(body) as UpdateItemDto;
    const owner = this.resolveOwner(req);
    return { data: await this.service.updateItem(owner.userId, owner.sessionId, productId, parsed) };
  }

  @Delete("items/:productId")
  @UseGuards(OptionalAuthGuard)
  async removeItem(@Req() req: any, @Param("productId") productId: string) {
    const owner = this.resolveOwner(req);
    return { data: await this.service.removeItem(owner.userId, owner.sessionId, productId) };
  }

  @Delete("items")
  @UseGuards(OptionalAuthGuard)
  async clear(@Req() req: any) {
    const owner = this.resolveOwner(req);
    return { data: await this.service.clear(owner.userId, owner.sessionId) };
  }
}
