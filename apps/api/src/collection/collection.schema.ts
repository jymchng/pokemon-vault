import { z } from "zod";

export const CollectionSchema = z.object({
  id: z.string().optional(),
});
