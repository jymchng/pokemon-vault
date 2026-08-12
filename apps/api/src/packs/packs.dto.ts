import { z } from "zod";

export interface PackDto {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  price: number;
  cardsPerPack: number;
  image: string | null;
  availability: string;
  description: string | null;
  setName: string | null;
}

export interface PackCardDto {
  id: string;
  cardId: string;
  cardName: string;
  cardNumber: string | null;
  rarity: string | null;
  type: string | null;
}

export interface PackOpeningDto {
  id: string; // opening_id (immutable record)
  idempotencyKey: string;
  userId: string;
  packId: string;
  packName: string;
  randomizationVersion: number;
  createdAt: Date;
  cards: PackCardDto[];
}

export const OpenPackSchema = z.object({
  idempotencyKey: z.string().min(8).max(200),
});

export type OpenPackDto = z.infer<typeof OpenPackSchema>;
