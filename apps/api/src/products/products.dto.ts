import { z } from "zod";

export const PRODUCT_TYPES = [
  "SINGLE_CARD",
  "BOOSTER_PACK",
  "BOOSTER_BOX",
  "ELITE_TRAINER_BOX",
  "GRADED_CARD",
  "ACCESSORY",
  "COLLECTION",
  "OTHER",
] as const;

export const PRODUCT_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;

export interface ProductVariantDto {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost: number | null;
  barcode: string | null;
  weight: number | null;
  status: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductListResult {
  items: ProductDto[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductDto {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  productType: string;
  price: number;
  compareAt: number | null;
  currency: string;
  status: string;
  weight: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  variants: ProductVariantDto[];
}

export const ProductVariantSchema = z.object({
  sku: z.string().min(2).max(64),
  name: z.string().min(1).max(200),
  price: z.coerce.number().nonnegative().multipleOf(0.01),
  cost: z.coerce.number().nonnegative().multipleOf(0.01).optional().nullable(),
  barcode: z.string().max(64).optional().nullable(),
  weight: z.coerce.number().nonnegative().optional().nullable(),
  status: z.enum(PRODUCT_STATUSES).default("ACTIVE"),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const CreateProductSchema = z.object({
  sku: z.string().min(2).max(64),
  slug: z.string().min(2).max(200).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  productType: z.enum(PRODUCT_TYPES).default("SINGLE_CARD"),
  price: z.coerce.number().nonnegative().multipleOf(0.01),
  compareAt: z.coerce.number().nonnegative().multipleOf(0.01).optional().nullable(),
  currency: z.string().length(3).default("USD"),
  status: z.enum(PRODUCT_STATUSES).default("ACTIVE"),
  weight: z.coerce.number().nonnegative().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  variants: z.array(ProductVariantSchema).default([]),
});

export const UpdateProductSchema = CreateProductSchema.partial();
export const UpdateVariantSchema = ProductVariantSchema.partial();

export const ProductQuerySchema = z.object({
  category: z.string().max(100).optional(),
  productType: z.enum(PRODUCT_TYPES).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  search: z.string().max(200).optional(),
  cursor: z.string().min(1).optional(), // §86 cursor pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(24),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
export type ProductVariantInput = z.infer<typeof ProductVariantSchema>;
export type UpdateVariantDto = z.infer<typeof UpdateVariantSchema>;
export type ProductQueryDto = z.infer<typeof ProductQuerySchema>;
