import { z } from "zod";

export const INVENTORY_STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "DAMAGED", "RETURNED"] as const;
export const MOVEMENT_REASONS = ["SALE", "RESERVE", "RELEASE", "RESTOCK", "DAMAGE", "RETURN"] as const;

export interface InventoryItemDto {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  locationId: string | null;
  locationName: string | null;
  status: string;
  quantity: number;
  reserved: number;
  available: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryMovementDto {
  id: string;
  itemId: string;
  change: number;
  reason: string;
  orderId: string | null;
  createdAt: Date;
}

export interface InventoryLocationDto {
  id: string;
  name: string;
  code: string;
}

export const CreateLocationSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
});

export const RestockSchema = z.object({
  quantity: z.coerce.number().int().positive().max(1_000_000),
  reason: z.enum(MOVEMENT_REASONS).default("RESTOCK"),
});

export const DamageSchema = z.object({
  quantity: z.coerce.number().int().positive().max(1_000_000),
});

export type CreateLocationDto = z.infer<typeof CreateLocationSchema>;
export type RestockDto = z.infer<typeof RestockSchema>;
export type DamageDto = z.infer<typeof DamageSchema>;
