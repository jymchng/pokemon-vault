import { z } from "zod";

export const PaymentsSchema = z.object({
  id: z.string().optional(),
});
