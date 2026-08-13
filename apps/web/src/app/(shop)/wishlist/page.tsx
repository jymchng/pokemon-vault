"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, X, LogIn } from "lucide-react";
import { useProducts, useCards } from "@/lib/hooks/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useCartStore } from "@/lib/store/cart-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";

export default function WishlistPage() {
  const ids = useWishlistStore((s) => s.ids);
  const toggle = useWishlistStore((s) => s.toggle);
  const addToCart = useCartStore((s) => s.addItem);
  const signedIn = useAuthStore((s) => s.signedIn);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);
  const { data: products = [] } = useProducts();
  const { data: cards = [] } = useCards();

  // Resolve wishlist product ids against the live catalog (products + cards).
  const saved = useMemo(() => {
    const items: {
      id: string;
      name: string;
      image: string;
      price: number;
      set: string;
      category: string;
      availability: string;
    }[] = [];
    for (const id of ids) {
      const p = products.find((prod) => prod.id === id);
      if (p) {
        items.push({
          id: p.id,
          name: p.name,
          image: p.image,
          price: p.price,
          set: p.set,
          category: p.category,
          availability: p.availability,
        });
        continue;
      }
      const c = cards.find((card) => card.id === id);
      if (c) {
        items.push({
          id: c.id,
          name: c.name,
          image: c.image,
          price: c.marketPrice,
          set: c.set,
          category: c.grade !== "Ungraded" ? "Graded Card" : "Single Card",
          availability: "In Stock",
        });
      }
    }
    return items;
  }, [ids, products, cards]);

  const handleRemove = async (id: string) => {
    try {
      await toggle(id);
      toast.success("Removed from wishlist");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  };

  const handleAddToCart = async (id: string) => {
    const item = saved.find((i) => i.id === id);
    if (!item) return;
    if (!signedIn) {
      setSignInOpen(true);
      return;
    }
    try {
      await addToCart({
        productId: id,
        name: item.name,
        image: item.image,
        price: item.price,
      });
      toast.success(`Added ${item.name} to cart`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Add to cart failed");
    }
  };

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Wishlist" subtitle="Save cards and products you love." />
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
            <LogIn className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Sign in to view your wishlist
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your wishlist is stored server-side — sign in to see your saved
            items.
          </p>
          <Button size="lg" onClick={() => setSignInOpen(true)}>
            Sign In / Create Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Wishlist"
        subtitle={`${ids.length} saved ${ids.length === 1 ? "item" : "items"}`}
        actions={
          ids.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                ids.forEach((id) => void handleRemove(id));
                toast.success("Wishlist cleared");
              }}
            >
              <X className="size-3.5" /> Clear All
            </Button>
          ) : undefined
        }
      />

      {saved.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-6" />}
          title="Your wishlist is empty"
          description="Save cards and products you love, then come back to grab them."
          primaryAction={
            <Button render={<Link href="/store" />} nativeButton={false}>
              Browse Store
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {saved.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.name}
                className="aspect-[2.5/3.5] w-full rounded-xl border border-border object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="flex flex-col gap-0.5 px-1 pb-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {item.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.set} · {item.category}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  $
                  {item.price.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 border-t border-border px-1 pt-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAddToCart(item.id)}
                >
                  <ShoppingBag className="size-3.5" /> Add to Cart
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(item.id)}
                  aria-label={`Remove ${item.name} from wishlist`}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
