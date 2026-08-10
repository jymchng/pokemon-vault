"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, X } from "lucide-react";
import { getProductById } from "@/lib/data/products";
import { getCardById } from "@/lib/data/cards";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useCartStore } from "@/lib/store/cart-store";
import { toast } from "sonner";

export default function WishlistPage() {
  const ids = useWishlistStore((s) => s.ids);
  const toggle = useWishlistStore((s) => s.toggle);
  const addToCart = useCartStore((s) => s.addItem);

  const saved = useMemo(() => {
    const items: {
      id: string;
      name: string;
      image: string;
      price: number;
      set: string;
      category: string;
      availability: string;
      rating: number;
      stock: number;
    }[] = [];
    for (const id of ids) {
      const p = getProductById(id);
      if (p) {
        items.push({
          id: p.id,
          name: p.name,
          image: p.image,
          price: p.price,
          set: p.set,
          category: p.category,
          availability: p.availability,
          rating: p.rating,
          stock: p.stock,
        });
        continue;
      }
      const c = getCardById(id);
      if (c) {
        items.push({
          id: c.id,
          name: c.name,
          image: c.image,
          price: c.marketPrice,
          set: c.set,
          category: c.grade !== "Ungraded" ? "Graded Card" : "Single Card",
          availability: "In Stock",
          rating: 4.8,
          stock: 1,
        });
      }
    }
    return items;
  }, [ids]);

  const handleRemove = (id: string) => {
    toggle(id);
    toast.success("Removed from wishlist");
  };

  const handleAddToCart = (id: string) => {
    const p = getProductById(id) ?? getCardById(id);
    if (!p) return;
    addToCart({
      productId: id,
      name: p.name,
      image: p.image,
      price:
        "price" in p
          ? (p as { price: number }).price
          : (p as { marketPrice: number }).marketPrice,
    });
    toast.success(`Added ${p.name} to cart`);
  };

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
                ids.forEach(toggle);
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
