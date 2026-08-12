import { z } from "zod";

export const InventorySchema = z.object({
  id: z.string().optional(),
});
