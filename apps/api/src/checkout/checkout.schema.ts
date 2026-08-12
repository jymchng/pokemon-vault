import { z } from "zod";

export const CheckoutSchema = z.object({
  id: z.string().optional(),
});
