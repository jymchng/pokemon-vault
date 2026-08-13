"use client";

import { create } from "zustand";
import {
  fetchCart,
  addCartItem as apiAdd,
  updateCartItem as apiUpdate,
  removeCartItem as apiRemove,
  clearCart as apiClear,
  type CartItemDto,
} from "@/lib/api";

export type CartItem = {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

/**
 * Cart — backed by the real backend (/cart/items, requires sign-in). The
 * store mirrors server state for the UI; every mutation calls the API first
 * and updates the mirror from the server response. Guests see an empty cart
 * and are prompted to sign in on the checkout page.
 */
type CartState = {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  sync: () => Promise<void>;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  subtotal: () => number;
  itemCount: () => number;
};

function fromDto(dto: CartItemDto): CartItem {
  return {
    productId: dto.productId,
    name: dto.productName,
    image: "/images/placeholder-card.png",
    price: dto.unitPrice,
    quantity: dto.quantity,
  };
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  loading: false,
  error: null,

  sync: async () => {
    set({ loading: true, error: null });
    try {
      const cart = await fetchCart();
      set({ items: cart.items.map(fromDto), loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load cart",
        items: [],
      });
    }
  },

  addItem: async (item, qty = 1) => {
    try {
      const cart = await apiAdd(item.productId, qty);
      set({ items: cart.items.map(fromDto), error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Add to cart failed" });
      throw err;
    }
  },

  removeItem: async (productId) => {
    try {
      const cart = await apiRemove(productId);
      set({ items: cart.items.map(fromDto), error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Remove failed" });
      throw err;
    }
  },

  updateQuantity: async (productId, quantity) => {
    try {
      const cart = await apiUpdate(productId, quantity);
      set({ items: cart.items.map(fromDto), error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Update failed" });
      throw err;
    }
  },

  clearCart: async () => {
    try {
      const cart = await apiClear();
      set({ items: cart.items.map(fromDto), error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Clear failed" });
      throw err;
    }
  },

  subtotal: () =>
    get().items.reduce((acc, i) => acc + i.price * i.quantity, 0),
  itemCount: () =>
    get().items.reduce((acc, i) => acc + i.quantity, 0),
}));
