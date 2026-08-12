import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { AddWishlistItemDto, AddWishlistItemSchema } from "./wishlist.dto";
import { WishlistService } from "./wishlist.service";

/**
 * Wishlist (authenticated user; server-side RBAC via AuthGuard).
 *   GET    /wishlist/items           list my wishlist
 *   POST   /wishlist/items           add (409 if already present — @@unique)
 *   DELETE /wishlist/items/:productId  remove
 */
@Controller("wishlist")
@UseGuards(AuthGuard)
export class WishlistController {
  constructor(private readonly service: WishlistService) {}

  @Get("items")
  async index(@Req() req: any) {
    return { data: await this.service.list(req.user.id) };
  }

  @Post("items")
  @HttpCode(HttpStatus.CREATED)
  async add(@Req() req: any, @Body() body: unknown) {
    const parsed = AddWishlistItemSchema.parse(body) as AddWishlistItemDto;
    return { data: await this.service.add(req.user.id, parsed) };
  }

  @Delete("items/:productId")
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: any, @Param("productId") productId: string) {
    return { data: await this.service.remove(req.user.id, productId) };
  }
}
