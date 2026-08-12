import { z } from "zod";

export const SetsSchema = z.object({
  id: z.string().optional(),
});
