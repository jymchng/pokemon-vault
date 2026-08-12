import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { AuditService } from "./audit.service";
import { AuditLogInput, AuditLogSchema, AuditQueryDto, AuditQuerySchema } from "./audit.dto";

/**
 * Audit log API (§89).
 *   GET  /audit                 STAFF+ — paginated, filterable
 *   POST /audit                 SUPER_ADMIN — write an entry (system/worker use)
 */
@Controller("audit")
@UseGuards(AuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @Roles("STAFF")
  async index(@Query() query: unknown) {
    const parsed = AuditQuerySchema.parse(query ?? {}) as AuditQueryDto;
    return { data: await this.service.list(parsed) };
  }

  @Post()
  @Roles("SUPER_ADMIN")
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown, @Req() req: any) {
    const parsed = AuditLogSchema.parse(body) as AuditLogInput;
    const entry: AuditLogInput = {
      ...parsed,
      actorId: parsed.actorId ?? req.user?.id ?? null,
      ipAddress: parsed.ipAddress ?? req.ip ?? null,
      userAgent: parsed.userAgent ?? req.headers?.["user-agent"] ?? null,
    };
    await this.service.record(entry);
    return { data: { ok: true } };
  }
}
