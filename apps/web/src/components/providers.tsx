"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useCollectionStore } from "@/lib/store/collection-store";
import { useRewardsStore } from "@/lib/store/rewards-store";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  // Hydrate backend-backed auth + user data on mount (token → /auth/me →
  // cart/wishlist/collection/rewards sync when signed in).
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const signedIn = useAuthStore((s) => s.signedIn);
  const syncCart = useCartStore((s) => s.sync);
  const syncWishlist = useWishlistStore((s) => s.sync);
  const syncCollection = useCollectionStore((s) => s.sync);
  const syncRewards = useRewardsStore((s) => s.sync);

  useEffect(() => {
    void (async () => {
      await hydrateAuth();
      if (useAuthStore.getState().signedIn) {
        await Promise.allSettled([
          syncCart(),
          syncWishlist(),
          syncCollection(),
          syncRewards(),
        ]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When auth state flips to signed-in, sync user data.
  useEffect(() => {
    if (signedIn) {
      void Promise.allSettled([syncCart(), syncWishlist(), syncCollection(), syncRewards()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
