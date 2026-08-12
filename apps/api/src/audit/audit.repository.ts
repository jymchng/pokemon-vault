import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditDto, AuditLogInput } from "./audit.dto";

/** Data access boundary for audit logs (§89). */
@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Write one audit entry. Never throws into the caller — audit is best-effort. */
  async create(entry: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId ?? null,
          action: entry.action,
          resourceType: entry.resourceType ?? null,
          resourceId: entry.resourceId ?? null,
          before: (entry.before ?? null) as any,
          after: (entry.after ?? null) as any,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        },
      });
    } catch (err) {
      // Audit must never break the business operation.
      console.error("[audit] failed to write entry", (err as Error).message);
    }
  }

  async findAll(opts: {
    actorId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    page: number;
    limit: number;
  }): Promise<{ items: AuditDto[]; total: number }> {
    const where: any = {};
    if (opts.actorId) where.actorId = opts.actorId;
    if (opts.action) where.action = opts.action;
    if (opts.resourceType) where.resourceType = opts.resourceType;
    if (opts.resourceId) where.resourceId = opts.resourceId;
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        actorId: r.actorId,
        action: r.action,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        before: r.before,
        after: r.after,
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    };
  }
}
