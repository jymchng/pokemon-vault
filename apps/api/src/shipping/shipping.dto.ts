import { z } from "zod";

export const SHIPMENT_STATUSES = [
  "PENDING", "LABEL_CREATED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "EXCEPTION",
] as const;

export interface AddressDto {
  id: string;
  userId: string | null;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal: string | null;
  country: string;
  isDefault: boolean;
}

export interface ShipmentDto {
  id: string;
  orderId: string;
  orderNumber: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: string;
  estimatedDelivery: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShipmentItemDto {
  id: string;
  shipmentId: string;
  orderItemId: string | null;
  userId: string | null;
  quantity: number;
}

export const CreateAddressSchema = z.object({
  label: z.string().max(100).optional().nullable(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional().nullable(),
  postal: z.string().max(20).optional().nullable(),
  country: z.string().length(2).default("US"),
  isDefault: z.boolean().default(false),
});

export const UpdateAddressSchema = CreateAddressSchema.partial();

export const CreateShipmentSchema = z.object({
  orderId: z.string().uuid(),
  carrier: z.string().max(100).optional().nullable(),
  trackingNumber: z.string().max(200).optional().nullable(),
  trackingUrl: z.string().url().max(1000).optional().nullable(),
  estimatedDelivery: z.coerce.date().optional().nullable(),
});

export const UpdateShipmentSchema = z.object({
  carrier: z.string().max(100).optional().nullable(),
  trackingNumber: z.string().max(200).optional().nullable(),
  trackingUrl: z.string().url().max(1000).optional().nullable(),
  status: z.enum(SHIPMENT_STATUSES).optional(),
  estimatedDelivery: z.coerce.date().optional().nullable(),
  shippedAt: z.coerce.date().optional().nullable(),
  deliveredAt: z.coerce.date().optional().nullable(),
});

export type CreateAddressDto = z.infer<typeof CreateAddressSchema>;
export type UpdateAddressDto = z.infer<typeof UpdateAddressSchema>;
export type CreateShipmentDto = z.infer<typeof CreateShipmentSchema>;
export type UpdateShipmentDto = z.infer<typeof UpdateShipmentSchema>;
