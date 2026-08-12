import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import {
  ActivityQuerySchema,
  AddItemSchema,
  AddItemDto,
  UpdateItemSchema,
  UpdateItemDto,
} from "./collection.dto";
import { CollectionService } from "./collection.service";

/**
 * Collection (§30-33). Authenticated, owner-scoped.
 *   GET    /collection/items            my collection items (multiple copies/quantity)
 *   POST   /collection/items            add card (source PURCHASE/PACK_OPENING/...)
 *   PATCH  /collection/items/:cardId    update quantity/condition/grade/source
 *   DELETE /collection/items/:cardId    remove (reduce quantity)
 *   GET    /collection/sets             set progress (owned/total/percentage)
 *   GET    /collection/sets/:setId      single-set progress
 *   GET    /collection/activity         immutable activity stream
 */
@Controller("collection")
@UseGuards(AuthGuard)
export class CollectionController {
  constructor(private readonly service: CollectionService) {}

  @Get("items")
  async items(@Req() req: any) {
    return { data: await this.service.listItems(req.user.id) };
  }

  @Post("items")
  async addItem(@Req() req: any, @Body() body: unknown) {
    const parsed = AddItemSchema.parse(body) as AddItemDto;
    return { data: await this.service.addItem(req.user.id, parsed) };
  }

  @Patch("items/:cardId")
  async updateItem(@Req() req: any, @Param("cardId") cardId: string, @Body() body: unknown) {
    const parsed = UpdateItemSchema.parse(body) as UpdateItemDto;
    return { data: await this.service.updateItem(req.user.id, cardId, parsed) };
  }

  @Delete("items/:cardId")
  async removeItem(@Req() req: any, @Param("cardId") cardId: string, @Query("quantity") quantity?: string) {
    const q = quantity ? Number(quantity) : 1;
    return { data: await this.service.removeItem(req.user.id, cardId, q) };
  }

  @Get("sets")
  async sets(@Req() req: any) {
    return { data: await this.service.setProgress(req.user.id) };
  }

  @Get("sets/:setId")
  async setDetail(@Req() req: any, @Param("setId") setId: string) {
    return { data: await this.service.setProgressFor(setId, req.user.id) };
  }

  @Get("activity")
  async activity(@Req() req: any, @Query() query: unknown) {
    const parsed = ActivityQuerySchema.parse(query ?? {});
    const { items, total } = await this.service.activity(req.user.id, parsed.page, parsed.limit);
    return { data: items, meta: { total, page: parsed.page, limit: parsed.limit } };
  }
}
