import { z } from "zod";

export const AuditSchema = z.object({
  id: z.string().optional(),
});
