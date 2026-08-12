import { z } from "zod";

export interface CartItemDto {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number; // server-computed from Product.price — client price NEVER trusted
  lineTotal: number;
  available: number; // inventory available at read time
  createdAt: Date;
  updatedAt: Date;
}

export interface CartDto {
  id: string;
  userId: string | null;
  sessionId: string | null;
  items: CartItemDto[];
  subtotal: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export const AddItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().max(1000).default(1),
});

export const UpdateItemSchema = z.object({
  quantity: z.coerce.number().int().positive().max(1000),
});

export type AddItemDto = z.infer<typeof AddItemSchema>;
export type UpdateItemDto = z.infer<typeof UpdateItemSchema>;
