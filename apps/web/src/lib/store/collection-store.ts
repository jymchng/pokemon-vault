"use client";

import { create } from "zustand";
import {
  fetchCollectionItems,
  addCollectionItem as apiAddItem,
  type CollectionItemDto,
} from "@/lib/api";

export interface OwnedCard {
  id: string;
  name: string;
  rarity: string;
  set: string;
  image: string;
  quantity: number;
  acquiredAt: string;
}

/**
 * Collection — backed by the real backend (/collection/items, requires
 * sign-in). The store mirrors server state; `addCards` adds each pulled card
 * via the API (pack openings also persist server-side via POST /packs/:id/open).
 */
type CollectionState = {
  owned: OwnedCard[];
  loading: boolean;
  error: string | null;
  sync: () => Promise<void>;
  addCards: (cards: Omit<OwnedCard, "quantity" | "acquiredAt">[]) => Promise<void>;
  removeCard: (id: string) => void;
  hasCard: (id: string) => boolean;
};

function fromDto(c: CollectionItemDto): OwnedCard {
  return {
    id: c.cardId,
    name: c.cardName,
    rarity: c.rarity ?? "Common",
    set: c.setName,
    image: "/images/placeholder-card.png",
    quantity: c.quantity,
    acquiredAt: c.acquiredAt ?? new Date().toISOString(),
  };
}

export const useCollectionStore = create<CollectionState>()((set, get) => ({
  owned: [],
  loading: false,
  error: null,

  sync: async () => {
    set({ loading: true, error: null });
    try {
      const items = await fetchCollectionItems();
      set({ owned: items.map(fromDto), loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load collection",
        owned: [],
      });
    }
  },

  addCards: async (cards) => {
    try {
      for (const card of cards) {
        await apiAddItem(card.id, 1);
      }
      const items = await fetchCollectionItems();
      set({ owned: items.map(fromDto), error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Add to collection failed" });
      throw err;
    }
  },

  removeCard: (id) =>
    set((s) => ({ owned: s.owned.filter((c) => c.id !== id) })),
  hasCard: (id) => get().owned.some((c) => c.id === id),
}));
