import { Injectable } from "@nestjs/common";
import { AuditRepository } from "./audit.repository";
import { AuditDto, AuditLogInput, AuditQueryDto } from "./audit.dto";

/** Audit logging (§89): write + read. No unnecessary sensitive data. */
@Injectable()
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  /** Record an administrative change (best-effort, never throws). */
  async record(entry: AuditLogInput): Promise<void> {
    await this.repo.create(entry);
  }

  /** Paginated audit log query (STAFF+/ADMIN). */
  async list(query: AuditQueryDto): Promise<{ items: AuditDto[]; total: number }> {
    return this.repo.findAll({
      actorId: query.actorId,
      action: query.action,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      page: query.page,
      limit: query.limit,
    });
  }
}
