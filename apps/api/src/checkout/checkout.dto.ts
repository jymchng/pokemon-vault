import { z } from "zod";

export const CheckoutItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().max(1000),
});

export const CheckoutSchema = z.object({
  // Items may be omitted to checkout the user's cart (validate-cart path).
  items: z.array(CheckoutItemSchema).min(1).max(50).optional(),
  email: z.string().email().max(254).optional(),
});

export const PaySchema = z.object({
  paymentMethod: z.string().max(50).default("card"),
});

export type CheckoutItemDto = z.infer<typeof CheckoutItemSchema>;
export type CheckoutDto = z.infer<typeof CheckoutSchema>;
export type PayDto = z.infer<typeof PaySchema>;
