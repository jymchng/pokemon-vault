"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OwnedPack {
  slug: string;
  quantity: number;
}

type PackInventoryState = {
  packs: OwnedPack[];
  /** Add purchased packs to the unopened inventory (quantity-aware). */
  addPacks: (items: { slug: string; quantity: number }[]) => void;
  /** Open (consume) one pack of the given slug; removes it at quantity 0. */
  consumePack: (slug: string) => void;
  /** How many unopened packs of a slug the user owns. */
  getQuantity: (slug: string) => number;
};

export const usePackInventoryStore = create<PackInventoryState>()(
  persist(
    (set, get) => ({
      packs: [],
      addPacks: (items) =>
        set((s) => {
          const next = [...s.packs];
          for (const item of items) {
            if (item.quantity <= 0) continue;
            const idx = next.findIndex((p) => p.slug === item.slug);
            if (idx >= 0) {
              next[idx] = {
                ...next[idx],
                quantity: next[idx].quantity + item.quantity,
              };
            } else {
              next.push({ slug: item.slug, quantity: item.quantity });
            }
          }
          return { packs: next };
        }),
      consumePack: (slug) =>
        set((s) => {
          const idx = s.packs.findIndex((p) => p.slug === slug);
          if (idx < 0) return s;
          const next = [...s.packs];
          const qty = next[idx].quantity - 1;
          if (qty <= 0) {
            next.splice(idx, 1);
          } else {
            next[idx] = { ...next[idx], quantity: qty };
          }
          return { packs: next };
        }),
      getQuantity: (slug) =>
        get().packs.find((p) => p.slug === slug)?.quantity ?? 0,
    }),
    { name: "pokemon-vault-pack-inventory" },
  ),
);
