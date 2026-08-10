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
import { useActivityStore } from "@/lib/store/activity-store";
import { useRewardsStore } from "@/lib/store/rewards-store";

/* ── Query keys (single source of truth) ─────────────── */

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
    latestPulls: ["packs", "latest-pulls"] as const,
  },
  sets: {
    all: ["sets"] as const,
  },
  activity: {
    all: ["activity"] as const,
    platform: ["activity", "platform"] as const,
  },
  rewards: {
    tiers: ["rewards", "tiers"] as const,
    leaderboard: ["rewards", "leaderboard"] as const,
    waysToWin: ["rewards", "ways-to-win"] as const,
  },
  shipping: {
    addresses: ["shipping", "addresses"] as const,
    shipments: ["shipping", "shipments"] as const,
  },
} as const;

/* ── Cards ────────────────────────────────────────────── */

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

/* ── Products ─────────────────────────────────────────── */

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

/* ── Packs ────────────────────────────────────────────── */

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

export function useLatestPulls() {
  return useQuery({
    queryKey: queryKeys.packs.latestPulls,
    queryFn: api.fetchLatestPulls,
  });
}

/* ── Sets ─────────────────────────────────────────────── */

export function useSets() {
  return useQuery({
    queryKey: queryKeys.sets.all,
    queryFn: api.fetchSets,
  });
}

/* ── Activity ─────────────────────────────────────────── */

export function useActivity() {
  return useQuery({
    queryKey: queryKeys.activity.all,
    queryFn: api.fetchActivity,
  });
}

export function usePlatformPulls() {
  return useQuery({
    queryKey: queryKeys.activity.platform,
    queryFn: api.fetchPlatformPulls,
  });
}

/** Infinite pull feed (reference's long scrollable pull list). */
export function useInfinitePulls() {
  return useInfiniteQuery({
    queryKey: queryKeys.activity.platform,
    queryFn: ({ pageParam = 0 }) =>
      api
        .fetchPlatformPulls()
        .then((all) => all.slice(pageParam * 5, pageParam * 5 + 5)),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 5 ? allPages.length : undefined,
  });
}

/* ── Rewards / Leaderboard ────────────────────────────── */

export function useRewardTiers() {
  return useQuery({
    queryKey: queryKeys.rewards.tiers,
    queryFn: api.fetchRewardTiers,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: queryKeys.rewards.leaderboard,
    queryFn: api.fetchLeaderboard,
  });
}

export function useWaysToWin() {
  return useQuery({
    queryKey: queryKeys.rewards.waysToWin,
    queryFn: api.fetchWaysToWin,
  });
}

/* ── Shipping ─────────────────────────────────────────── */

export function useAddresses() {
  return useQuery({
    queryKey: queryKeys.shipping.addresses,
    queryFn: api.fetchAddresses,
  });
}

export function useShipments() {
  return useQuery({
    queryKey: queryKeys.shipping.shipments,
    queryFn: api.fetchShipments,
  });
}

/* ── Mutations (client-state sync + cache invalidation) ─ */

export function useAddToCartMutation() {
  const addItem = useCartStore((s) => s.addItem);
  return useMutation({
    mutationFn: async (item: {
      productId: string;
      name: string;
      image: string;
      price: number;
    }) => {
      addItem(item);
      return item;
    },
  });
}

export function useToggleWishlistMutation() {
  const toggle = useWishlistStore((s) => s.toggle);
  return useMutation({
    mutationFn: async (id: string) => {
      toggle(id);
      return id;
    },
  });
}

export function useOpenPackMutation() {
  const queryClient = useQueryClient();
  const addCards = useCollectionStore((s) => s.addCards);
  const addEvent = useActivityStore((s) => s.addEvent);
  const addXp = useRewardsStore((s) => s.addXp);

  return useMutation({
    mutationFn: async (
      pulls: {
        id: string;
        name: string;
        rarity: string;
        set: string;
        image: string;
      }[],
    ) => {
      // Simulate server round-trip for opening a pack
      await new Promise((r) => setTimeout(r, 400));
      addCards(pulls);
      addEvent({
        id: `evt-${Date.now()}`,
        type: "opened_pack",
        title: "Opened Booster Pack",
        subtitle: pulls.map((p) => p.name).join(", "),
        image: "/images/placeholder-card.png",
        date: new Date().toISOString(),
        xp: 10,
      });
      addXp(10);
      return pulls;
    },
    onSuccess: () => {
      // Collection/activity are client stores, but invalidate server-mirror caches
      queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
    },
  });
}
