import { z } from "zod";

export const ProductsSchema = z.object({
  id: z.string().optional(),
});
