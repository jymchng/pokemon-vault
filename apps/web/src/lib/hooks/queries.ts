"use client";

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "@/lib/api";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useCollectionStore } from "@/lib/store/collection-store";
import { useRewardsStore } from "@/lib/store/rewards-store";
import { useAuthStore } from "@/lib/store/auth-store";

/* ── Query keys (single source of truth) ──────────────────────────────── */

export const queryKeys = {
  cards: {
    all: ["cards"] as const,
    detail: (id: string) => ["cards", id] as const,
  },
  products: {
    all: ["products"] as const,
    detail: (id: string) => ["products", id] as const,
  },
  packs: {
    all: ["packs"] as const,
    detail: (slug: string) => ["packs", slug] as const,
  },
  sets: {
    all: ["sets"] as const,
    detail: (id: string) => ["sets", id] as const,
  },
  rewards: {
    tiers: ["rewards", "tiers"] as const,
    account: ["rewards", "me"] as const,
  },
  shipping: {
    addresses: ["shipping", "addresses"] as const,
    shipments: ["shipping", "shipments"] as const,
  },
  orders: {
    all: ["orders"] as const,
    detail: (id: string) => ["orders", id] as const,
  },
  collection: {
    items: ["collection", "items"] as const,
    sets: ["collection", "sets"] as const,
    activity: ["collection", "activity"] as const,
  },
} as const;

/* ── Cards ────────────────────────────────────────────────────────────── */

export function useCards() {
  return useQuery({
    queryKey: queryKeys.cards.all,
    queryFn: api.fetchCards,
  });
}

export function useCard(id: string) {
  return useQuery({
    queryKey: queryKeys.cards.detail(id),
    queryFn: () => api.fetchCardById(id),
    enabled: Boolean(id),
  });
}

/* ── Products ─────────────────────────────────────────────────────────── */

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.all,
    queryFn: api.fetchProducts,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => api.fetchProductById(id),
    enabled: Boolean(id),
  });
}

/* ── Packs ────────────────────────────────────────────────────────────── */

export function usePacks() {
  return useQuery({
    queryKey: queryKeys.packs.all,
    queryFn: api.fetchPacks,
  });
}

export function usePack(slug: string) {
  return useQuery({
    queryKey: queryKeys.packs.detail(slug),
    queryFn: () => api.fetchPackBySlug(slug),
    enabled: Boolean(slug),
  });
}

/* ── Sets ─────────────────────────────────────────────────────────────── */

export function useSets() {
  return useQuery({
    queryKey: queryKeys.sets.all,
    queryFn: api.fetchSets,
  });
}

export function useSet(id: string) {
  return useQuery({
    queryKey: queryKeys.sets.detail(id),
    queryFn: () => api.fetchSetBySlugOrId(id),
    enabled: Boolean(id),
  });
}

/* ── Rewards ──────────────────────────────────────────────────────────── */

export function useRewardTiers() {
  return useQuery({
    queryKey: queryKeys.rewards.tiers,
    queryFn: api.fetchRewardTiers,
  });
}

/** Auth-gated: rewards account (xp/level). */
export function useRewardAccount() {
  const signedIn = useAuthStore((s) => s.signedIn);
  return useQuery({
    queryKey: queryKeys.rewards.account,
    queryFn: api.fetchRewardAccount,
    enabled: signedIn,
  });
}

/* ── Shipping (auth-gated) ────────────────────────────────────────────── */

export function useAddresses() {
  const signedIn = useAuthStore((s) => s.signedIn);
  return useQuery({
    queryKey: queryKeys.shipping.addresses,
    queryFn: api.fetchAddresses,
    enabled: signedIn,
  });
}

export function useShipments() {
  const signedIn = useAuthStore((s) => s.signedIn);
  return useQuery({
    queryKey: queryKeys.shipping.shipments,
    queryFn: api.fetchShipments,
    enabled: signedIn,
  });
}

/* ── Collection (auth-gated) ──────────────────────────────────────────── */

export function useCollectionItems() {
  const signedIn = useAuthStore((s) => s.signedIn);
  return useQuery({
    queryKey: queryKeys.collection.items,
    queryFn: api.fetchCollectionItems,
    enabled: signedIn,
  });
}

export function useCollectionSets() {
  const signedIn = useAuthStore((s) => s.signedIn);
  return useQuery({
    queryKey: queryKeys.collection.sets,
    queryFn: api.fetchCollectionSets,
    enabled: signedIn,
  });
}

export function useCollectionActivity() {
  const signedIn = useAuthStore((s) => s.signedIn);
  return useQuery({
    queryKey: queryKeys.collection.activity,
    queryFn: api.fetchCollectionActivity,
    enabled: signedIn,
  });
}

/* ── Orders (auth-gated) ──────────────────────────────────────────────── */

export function useOrders() {
  const signedIn = useAuthStore((s) => s.signedIn);
  return useQuery({
    queryKey: queryKeys.orders.all,
    queryFn: api.fetchOrders,
    enabled: signedIn,
  });
}

export function useOrder(id: string) {
  const signedIn = useAuthStore((s) => s.signedIn);
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => api.fetchOrderById(id),
    enabled: Boolean(id) && signedIn,
  });
}

/* ── Mutations (server sync + cache invalidation) ─────────────────────── */

export function useAddToCartMutation() {
  const addItem = useCartStore((s) => s.addItem);
  return useMutation({
    mutationFn: async (item: {
      productId: string;
      name: string;
      image: string;
      price: number;
    }) => {
      await addItem(item);
      return item;
    },
  });
}

export function useToggleWishlistMutation() {
  const toggle = useWishlistStore((s) => s.toggle);
  return useMutation({
    mutationFn: async (id: string) => {
      await toggle(id);
      return id;
    },
  });
}

export function useOpenPackMutation() {
  const queryClient = useQueryClient();
  const addCards = useCollectionStore((s) => s.addCards);

  return useMutation({
    mutationFn: async (slug: string) => {
      // Server-side opening (§34-37): client never sends cards.
      const opening = await api.openPack(slug);
      return opening;
    },
    onSuccess: async () => {
      // The opening persisted cards to the user's collection server-side.
      await addCards([]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.collection.items });
    },
  });
}
