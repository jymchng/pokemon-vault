import { z } from "zod";

export const OrdersSchema = z.object({
  id: z.string().optional(),
});
