import { z } from "zod";

export const REWARD_TYPES = [
  "DISCOUNT", "SLEEVES", "PACK", "PROMO_CARD", "FREE_SHIPPING", "OTHER",
] as const;

export const XP_REASONS = [
  "PURCHASE", "SET_COMPLETION", "PACK_OPENING", "PROMOTION", "MILESTONE", "REDEMPTION",
] as const;

export interface RewardAccountDto {
  id: string;
  userId: string;
  xp: number;
  level: number;
  levelName: string;
  xpRequiredForNext: number | null;
  progressPercent: number;
  updatedAt: Date;
}

export interface RewardTransactionDto {
  id: string;
  accountId: string;
  delta: number;
  reason: string;
  reference: string | null;
  createdAt: Date;
}

export interface RewardDto {
  id: string;
  name: string;
  description: string | null;
  type: string;
  xpCost: number;
  inventory: number;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface RewardRedemptionDto {
  id: string;
  accountId: string;
  rewardId: string;
  rewardName: string;
  userId: string | null;
  status: string;
  createdAt: Date;
}

export const AwardXpSchema = z.object({
  userId: z.string().min(1).max(100).optional(), // target account (defaults to the caller)
  delta: z.coerce.number().int().positive().max(1_000_000),
  reason: z.enum(XP_REASONS),
  reference: z.string().max(200).optional().nullable(),
});

export const CreateRewardSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(REWARD_TYPES).default("OTHER"),
  xpCost: z.coerce.number().int().positive(),
  inventory: z.coerce.number().int().nonnegative().default(0),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const UpdateRewardSchema = CreateRewardSchema.partial();

export const CreateTierSchema = z.object({
  name: z.string().min(1).max(200),
  level: z.coerce.number().int().positive(),
  xpRequired: z.coerce.number().int().nonnegative(),
});

export const RedeemSchema = z.object({
  rewardId: z.string().uuid(),
});

export type AwardXpDto = z.infer<typeof AwardXpSchema>;
export type CreateRewardDto = z.infer<typeof CreateRewardSchema>;
export type UpdateRewardDto = z.infer<typeof UpdateRewardSchema>;
export type CreateTierDto = z.infer<typeof CreateTierSchema>;
export type RedeemDto = z.infer<typeof RedeemSchema>;
