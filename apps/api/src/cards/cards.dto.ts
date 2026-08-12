import { z } from "zod";

export const CARD_GRADES = [
  "UNGRADED", "PSA_10", "PSA_9", "PSA_8", "CGC_10", "CGC_9_5", "BGS_10", "BGS_9_5",
] as const;

export interface CardGradeDto {
  id: string;
  grade: string;
  gradingCompany: string | null;
  certificationNumber: string | null;
  cardId: string;
  createdAt: Date;
}

export interface CardLinkedProductDto {
  productId: string;
  sku: string;
  name: string;
  price: number;
  status: string;
  inventoryQuantity: number;
  // grade/condition/language + grading company/cert are projected from the
  // Card row / CardGrade records (never stored on Product).
  grade: string | null;
  condition: string | null;
  language: string;
  gradingCompany: string | null;
  certificationNumber: string | null;
}

export interface CardListResult {
  items: CardDto[];
  total: number;
  page: number;
  limit: number;
}

export interface CardDto {
  id: string;
  name: string;
  setName: string;
  cardNumber: string | null;
  rarity: string | null;
  type: string | null;
  hp: string | null;
  language: string;
  imageUrl: string | null;
  description: string | null;
  grade: string | null;
  condition: string | null;
  marketPrice: number | null;
  population: number | null;
  metadata: Record<string, unknown> | null;
  setId: string | null;
  createdAt: Date;
  updatedAt: Date;
  grades?: CardGradeDto[];
  linkedProducts?: CardLinkedProductDto[];
}

export const CardGradeSchema = z.object({
  grade: z.enum(CARD_GRADES),
  gradingCompany: z.string().max(20).optional().nullable(),
  certificationNumber: z.string().max(64).optional().nullable(),
});

export const CreateCardSchema = z.object({
  name: z.string().min(1).max(200),
  setName: z.string().min(1).max(200),
  cardNumber: z.string().max(20).optional().nullable(),
  rarity: z.string().max(100).optional().nullable(),
  type: z.string().max(50).optional().nullable(),
  hp: z.string().max(10).optional().nullable(),
  language: z.string().length(2).default("EN"),
  imageUrl: z.string().url().max(1000).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  grade: z.enum(CARD_GRADES).optional().nullable(),
  condition: z.string().max(50).optional().nullable(),
  marketPrice: z.coerce.number().nonnegative().multipleOf(0.01).optional().nullable(),
  population: z.coerce.number().int().nonnegative().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  setId: z.string().uuid().optional().nullable(),
  grades: z.array(CardGradeSchema).default([]),
});

export const UpdateCardSchema = CreateCardSchema.omit({ grades: true }).partial();

export const CardQuerySchema = z.object({
  setName: z.string().max(200).optional(),
  setId: z.string().uuid().optional(),
  setSlug: z.string().max(200).optional(),
  rarity: z.string().max(100).optional(),
  type: z.string().max(50).optional(),
  language: z.string().length(2).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const CreateCardGradeSchema = z.object({
  grade: z.enum(CARD_GRADES),
  gradingCompany: z.string().max(20).optional().nullable(),
  certificationNumber: z.string().max(64).optional().nullable(),
});

export const UpdateCardGradeSchema = CreateCardGradeSchema.partial();

export const LinkProductSchema = z.object({
  productId: z.string().uuid(),
});

export type CreateCardDto = z.infer<typeof CreateCardSchema>;
export type UpdateCardDto = z.infer<typeof UpdateCardSchema>;
export type CardQueryDto = z.infer<typeof CardQuerySchema>;
export type CreateCardGradeDto = z.infer<typeof CreateCardGradeSchema>;
export type UpdateCardGradeDto = z.infer<typeof UpdateCardGradeSchema>;
export type LinkProductDto = z.infer<typeof LinkProductSchema>;
