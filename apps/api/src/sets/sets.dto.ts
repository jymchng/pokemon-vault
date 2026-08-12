import { z } from "zod";

export interface SetDto {
  id: string;
  name: string;
  slug: string;
  series: string | null;
  releaseDate: Date | null;
  totalCards: number;
  logoUrl: string | null;
  symbolUrl: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  cardCount?: number;
}

export const CreateSetSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(2).max(200).optional(),
  series: z.string().max(200).optional().nullable(),
  releaseDate: z.coerce.date().optional().nullable(),
  totalCards: z.coerce.number().int().nonnegative().default(0),
  logoUrl: z.string().url().max(1000).optional().nullable(),
  symbolUrl: z.string().url().max(1000).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
});

export const UpdateSetSchema = CreateSetSchema.partial();

export type CreateSetDto = z.infer<typeof CreateSetSchema>;
export type UpdateSetDto = z.infer<typeof UpdateSetSchema>;
