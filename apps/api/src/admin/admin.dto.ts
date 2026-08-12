import { z } from "zod";

/**
 * Admin API DTOs (§88). Every mutation is validated; the admin service writes
 * an audit log entry (before/after redacted, §89) for each change.
 */

export const AdminRefundSchema = z.object({
  orderId: z.string().min(1).max(128),
  amount: z.coerce.number().nonnegative().multipleOf(0.01),
  reason: z.string().max(500).optional(),
});

export const AdminInventoryAdjustSchema = z.object({
  itemId: z.string().min(1).max(128),
  change: z.coerce.number().int().refine((n) => n !== 0, { message: "change must be non-zero" }),
  reason: z.string().max(200).optional(),
});

export const AdminCollectionGrantSchema = z.object({
  userId: z.string().uuid(),
  cardId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().default(1),
  note: z.string().max(300).optional(),
});

export const AdminUserStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
  reason: z.string().max(300).optional(),
});

export const AdminRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["CUSTOMER", "STAFF", "ADMIN", "SUPER_ADMIN"]),
  reason: z.string().max(300).optional(),
});

export type AdminRefundDto = z.infer<typeof AdminRefundSchema>;
export type AdminInventoryAdjustDto = z.infer<typeof AdminInventoryAdjustSchema>;
export type AdminCollectionGrantDto = z.infer<typeof AdminCollectionGrantSchema>;
export type AdminUserStatusDto = z.infer<typeof AdminUserStatusSchema>;
export type AdminRoleDto = z.infer<typeof AdminRoleSchema>;
