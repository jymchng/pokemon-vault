import { z } from "zod";

export const COLLECTION_SOURCES = [
  "PURCHASE", "PACK_OPENING", "MANUAL_ENTRY", "ADMIN_GRANT", "PROMOTIONAL",
] as const;

export const ACTIVITY_TYPES = [
  "CARD_ADDED", "CARD_REMOVED", "PACK_OPENED", "ORDER_COMPLETED", "REWARD_EARNED", "REWARD_REDEEMED",
] as const;

export interface CollectionItemDto {
  id: string;
  collectionId: string;
  cardId: string;
  cardName: string;
  cardNumber: string | null;
  rarity: string | null;
  setName: string;
  quantity: number;
  condition: string | null;
  grade: string | null;
  source: string;
  acquiredAt: Date | null;
  purchaseOrderId: string | null;
}

export interface SetProgressDto {
  setId: string;
  setName: string;
  slug: string;
  series: string | null;
  ownedCards: number;
  totalCards: number;
  completionPercentage: number;
}

export interface ActivityDto {
  id: string;
  userId: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export const AddItemSchema = z.object({
  cardId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().max(10000).default(1),
  condition: z.string().max(50).optional().nullable(),
  grade: z.string().max(20).optional().nullable(),
  source: z.enum(COLLECTION_SOURCES).default("MANUAL_ENTRY"),
  acquiredAt: z.coerce.date().optional().nullable(),
  purchaseOrderId: z.string().max(100).optional().nullable(),
});

export const UpdateItemSchema = AddItemSchema.partial().omit({ cardId: true });

export const ActivityQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type AddItemDto = z.infer<typeof AddItemSchema>;
export type UpdateItemDto = z.infer<typeof UpdateItemSchema>;
export type ActivityQueryDto = z.infer<typeof ActivityQuerySchema>;
