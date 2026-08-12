import { z } from "zod";

export const MediaSchema = z.object({
  id: z.string().optional(),
});
