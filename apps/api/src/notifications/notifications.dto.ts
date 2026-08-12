import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "ORDER_UPDATE", "SHIPPING_UPDATE", "REWARD_AVAILABLE", "COLLECTION_MILESTONE", "PROMOTION", "SYSTEM",
] as const;

export interface NotificationDto {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  readAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface NotificationPreferenceDto {
  userId: string;
  orderUpdates: boolean;
  shippingUpdates: boolean;
  rewardAvailable: boolean;
  collectionMilestones: boolean;
  promotions: boolean;
  systemMessages: boolean;
  emailOptIn: boolean;
}

export const NotificationQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const CreateNotificationSchema = z.object({
  userId: z.string().min(1).max(100),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const UpdatePreferencesSchema = z.object({
  orderUpdates: z.boolean().optional(),
  shippingUpdates: z.boolean().optional(),
  rewardAvailable: z.boolean().optional(),
  collectionMilestones: z.boolean().optional(),
  promotions: z.boolean().optional(),
  systemMessages: z.boolean().optional(),
  emailOptIn: z.boolean().optional(),
});

export type NotificationQueryDto = z.infer<typeof NotificationQuerySchema>;
export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>;
export type UpdatePreferencesDto = z.infer<typeof UpdatePreferencesSchema>;
