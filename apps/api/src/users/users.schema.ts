import { z } from "zod";

export const UsersSchema = z.object({
  id: z.string().optional(),
});
