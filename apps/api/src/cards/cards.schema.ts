import { z } from "zod";

export const CardsSchema = z.object({
  id: z.string().optional(),
});
