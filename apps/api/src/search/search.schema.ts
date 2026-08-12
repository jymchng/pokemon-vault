import { z } from "zod";

export const SearchSchema = z.object({
  id: z.string().optional(),
});
