"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OwnedCard {
  id: string;
  name: string;
  rarity: string;
  set: string;
  image: string;
  quantity: number;
  acquiredAt: string;
}

type CollectionState = {
  owned: OwnedCard[];
  addCards: (cards: Omit<OwnedCard, "quantity" | "acquiredAt">[]) => void;
  removeCard: (id: string) => void;
  hasCard: (id: string) => boolean;
};

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      owned: [],
      addCards: (cards) =>
        set((s) => {
          const existing = [...s.owned];
          for (const card of cards) {
            const idx = existing.findIndex(
              (c) =>
                c.name === card.name &&
                c.set === card.set &&
                c.rarity === card.rarity,
            );
            if (idx >= 0) {
              existing[idx] = {
                ...existing[idx],
                quantity: existing[idx].quantity + 1,
              };
            } else {
              existing.push({
                ...card,
                quantity: 1,
                acquiredAt: new Date().toISOString(),
              });
            }
          }
          return { owned: existing };
        }),
      removeCard: (id) =>
        set((s) => ({ owned: s.owned.filter((c) => c.id !== id) })),
      hasCard: (id) => get().owned.some((c) => c.id === id),
    }),
    { name: "pokemon-vault-collection" },
  ),
);
