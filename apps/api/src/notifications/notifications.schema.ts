import { z } from "zod";

export const NotificationsSchema = z.object({
  id: z.string().optional(),
});
