import { z } from "zod";

export const WishlistSchema = z.object({
  id: z.string().optional(),
});
