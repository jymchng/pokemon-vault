import { z } from "zod";

export const CartSchema = z.object({
  id: z.string().optional(),
});
