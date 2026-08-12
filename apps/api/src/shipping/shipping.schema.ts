import { z } from "zod";

export const ShippingSchema = z.object({
  id: z.string().optional(),
});
