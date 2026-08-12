import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { QueueService } from "../queue/queue.service";
import {
  CreateNotificationSchema,
  NotificationQuerySchema,
  UpdatePreferencesSchema,
} from "./notifications.dto";
import { NotificationsService } from "./notifications.service";

/**
 * Notifications (§43).
 *   GET  /notifications              auth — list (paged, unreadOnly, type filter)
 *   PATCH /notifications/:id/read    auth — mark one read
 *   PATCH /notifications/read-all    auth — mark all read
 *   GET  /notifications/preferences  auth — notification preferences
 *   PATCH /notifications/preferences auth — update preferences
 *   POST /notifications              STAFF+ — push a notification (order/shipping/
 *                                     reward/milestone/promo/system)
 */
@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly queue: QueueService,
  ) {}

  @Get()
  async index(@Req() req: any, @Query() query: unknown) {
    const parsed = NotificationQuerySchema.parse(query ?? {});
    const { items, total, unread } = await this.service.list(req.user.id, parsed);
    return { data: items, meta: { total, unread, page: parsed.page, limit: parsed.limit } };
  }

  @Get("preferences")
  async getPreferences(@Req() req: any) {
    return { data: await this.service.getPreferences(req.user.id) };
  }

  @Patch("preferences")
  async updatePreferences(@Req() req: any, @Body() body: unknown) {
    const parsed = UpdatePreferencesSchema.parse(body);
    return { data: await this.service.updatePreferences(req.user.id, parsed) };
  }

  @Patch("read-all")
  @HttpCode(HttpStatus.OK)
  async readAll(@Req() req: any) {
    return { data: await this.service.markAllRead(req.user.id) };
  }

  @Patch(":id/read")
  @HttpCode(HttpStatus.OK)
  async read(@Req() req: any, @Param("id") id: string) {
    return { data: await this.service.markRead(req.user.id, id) };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown) {
    const parsed = CreateNotificationSchema.parse(body);
    // Enqueue to the notifications queue — the worker persists it (async,
    // retryable, idempotent via dedupeId). Never synchronous in the request.
    const idempotencyKey = `notif_${parsed.type}_${parsed.userId}_${(parsed.metadata as any)?.dedupeId ?? String(Date.now())}`;
    const jobId = await this.queue.enqueue(
      "notifications",
      `send:${parsed.type}`,
      { ...parsed, metadata: parsed.metadata ?? {}, idempotencyKey },
      { jobId: idempotencyKey },
    );
    return { data: { queued: true, jobId } };
  }
}
