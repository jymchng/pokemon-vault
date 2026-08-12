import { z } from "zod";

export const ORDER_STATUSES = [
  "PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED",
  "DELIVERED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED",
] as const;

export interface OrderItemDto {
  id: string;
  productId: string | null;
  productName: string; // snapshot at purchase time
  sku: string;
  unitPrice: number;
  quantity: number;
  tax: number;
  discount: number;
  metadata: Record<string, unknown> | null;
}

export interface OrderDto {
  id: string; // internal UUID PK
  orderNumber: string; // human-readable, e.g. PV-10482
  userId: string | null;
  email: string | null;
  status: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemDto[];
}

export const OrderQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export type OrderQueryDto = z.infer<typeof OrderQuerySchema>;
export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;
