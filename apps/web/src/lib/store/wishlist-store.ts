"use client";

import { create } from "zustand";
import {
  fetchWishlist,
  addWishlistItem as apiAdd,
  removeWishlistItem as apiRemove,
} from "@/lib/api";

/**
 * Wishlist — backed by the real backend (/wishlist/items, requires sign-in).
 * The store mirrors server state; mutations call the API and re-sync.
 */
type WishlistState = {
  ids: string[];
  loading: boolean;
  error: string | null;
  sync: () => Promise<void>;
  toggle: (productId: string) => Promise<void>;
  has: (id: string) => boolean;
  clear: () => void;
};

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  ids: [],
  loading: false,
  error: null,

  sync: async () => {
    set({ loading: true, error: null });
    try {
      const items = await fetchWishlist();
      set({ ids: items.map((i) => i.productId), loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load wishlist",
        ids: [],
      });
    }
  },

  toggle: async (productId) => {
    const current = get().ids;
    const has = current.includes(productId);
    try {
      if (has) {
        await apiRemove(productId);
        set({ ids: current.filter((x) => x !== productId), error: null });
      } else {
        await apiAdd(productId);
        set({ ids: [...current, productId], error: null });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Wishlist update failed" });
      throw err;
    }
  },

  has: (id) => get().ids.includes(id),
  clear: () => set({ ids: [] }),
}));
