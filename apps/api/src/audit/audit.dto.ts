import { z } from "zod";

/** Audit log entry (§89) — no unnecessary sensitive data. */
export class AuditDto {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  before: unknown | null;
  after: unknown | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

/** What we write into before/after — only business-relevant fields, redacted. */
export const AuditLogSchema = z.object({
  actorId: z.string().uuid().nullable().optional(),
  action: z.string().min(1).max(64),
  resourceType: z.string().min(1).max(64).nullable().optional(),
  resourceId: z.string().max(128).nullable().optional(),
  before: z.record(z.string(), z.unknown()).nullable().optional(),
  after: z.record(z.string(), z.unknown()).nullable().optional(),
  ipAddress: z.string().max(64).nullable().optional(),
  userAgent: z.string().max(512).nullable().optional(),
});

export type AuditLogInput = z.infer<typeof AuditLogSchema>;

/** Validated query for reading audit logs (STAFF+/ADMIN). */
export const AuditQuerySchema = z.object({
  actorId: z.string().uuid().optional(),
  action: z.string().max(64).optional(),
  resourceType: z.string().max(64).optional(),
  resourceId: z.string().max(128).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type AuditQueryDto = z.infer<typeof AuditQuerySchema>;
