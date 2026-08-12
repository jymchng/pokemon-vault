import { z } from "zod";

export interface WishlistItemDto {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  price: number;
  status: string;
  createdAt: Date;
}

export const AddWishlistItemSchema = z.object({
  productId: z.string().uuid(),
});

export type AddWishlistItemDto = z.infer<typeof AddWishlistItemSchema>;
