import { z } from "zod";

export const AdminSchema = z.object({
  id: z.string().optional(),
});
