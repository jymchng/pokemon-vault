import { z } from "zod";

export const PacksSchema = z.object({
  id: z.string().optional(),
});
