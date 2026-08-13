"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Heart, ShoppingBag, X, ArrowLeft, LogIn } from "lucide-react";
import { useCard, useCards, useCollectionItems } from "@/lib/hooks/queries";
import { CardArt } from "@/components/cards/card-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import {
  formatCurrency,
  rarityVariant,
  gradeVariant,
  formatDate,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";

export default function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: card } = useCard(id);
  const { data: allCards = [] } = useCards();
  const { data: collectionItems = [] } = useCollectionItems();
  const signedIn = useAuthStore((s) => s.signedIn);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);

  const addToCart = useCartStore((s) => s.addItem);
  const wishlistIds = useWishlistStore((s) => s.ids);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const wishlisted = wishlistIds.includes(id);

  const ownedQty = useMemo(
    () => collectionItems.find((i) => i.cardId === id)?.quantity ?? 0,
    [collectionItems, id],
  );

  if (!card) {
    return (
      <EmptyState
        icon={<X className="size-6" />}
        title="Card not found"
        description="This card isn't in the catalog."
      />
    );
  }

  const similar = allCards
    .filter((c) => c.set === card.set && c.id !== card.id)
    .slice(0, 4);

  const handleAddToCart = async () => {
    if (!signedIn) {
      setSignInOpen(true);
      return;
    }
    try {
      await addToCart({
        productId: card.id,
        name: card.name,
        image: card.image,
        price: card.marketPrice,
      });
      toast.success(`Added ${card.name} to cart`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Add to cart failed");
    }
  };

  const handleWishlist = async () => {
    if (!signedIn) {
      setSignInOpen(true);
      return;
    }
    try {
      await toggleWishlist(card.id);
      toast.success(
        wishlisted
          ? `Removed ${card.name} from wishlist`
          : `Added ${card.name} to wishlist`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wishlist update failed");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => router.back()}
      >
        <ArrowLeft className="size-3.5" /> Back
      </Button>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: art */}
        <div className="mx-auto w-full max-w-sm">
          <CardArt
            src={card.image}
            alt={card.name}
            priority
            className="rounded-2xl border-border-strong"
            sizes="(max-width: 1024px) 60vw, 40vw"
          />
        </div>

        {/* Right: details */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {card.name}
              </h1>
              <p className="text-sm text-muted-foreground">{card.set}</p>
            </div>
            <Badge variant={gradeVariant(card.grade)}>{card.grade}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={rarityVariant(card.rarity)}>{card.rarity}</Badge>
            <Badge variant="outline">{card.type}</Badge>
            <Badge variant="outline">Card #{card.cardNumber}</Badge>
          </div>

          <Separator />

          <dl className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface p-3">
              <dt className="text-[10px] font-semibold tracking-widest text-muted-foreground">
                CONDITION
              </dt>
              <dd className="text-sm font-medium text-foreground">
                {card.condition}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface p-3">
              <dt className="text-[10px] font-semibold tracking-widest text-muted-foreground">
                ACQUIRED
              </dt>
              <dd className="text-sm font-medium text-foreground">
                {formatDate(card.acquiredAt)}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface p-3">
              <dt className="text-[10px] font-semibold tracking-widest text-muted-foreground">
                QUANTITY
              </dt>
              <dd className="text-sm font-medium text-foreground">
                {signedIn ? ownedQty : "—"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface p-3">
              <dt className="text-[10px] font-semibold tracking-widest text-muted-foreground">
                MARKET VALUE
              </dt>
              <dd className="text-sm font-semibold text-primary">
                {formatCurrency(card.marketPrice)}
              </dd>
            </div>
          </dl>

          {card.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {card.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {!signedIn ? (
              <Button onClick={() => setSignInOpen(true)}>
                <LogIn className="size-4" /> Sign in to collect
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={handleWishlist}>
                  <Heart className={cn("size-4", wishlisted && "fill-current")} />
                  {wishlisted ? "In Wishlist" : "Add to Wishlist"}
                </Button>
                <Button variant="ghost" onClick={handleAddToCart}>
                  <ShoppingBag className="size-4" /> Add to Cart
                </Button>
              </>
            )}
          </div>

          {card.population !== undefined && (
            <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Population</span>
                <span className="font-semibold text-foreground">
                  {card.population.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Recent Price</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(card.marketPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Market Estimate</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(card.marketPrice * 1.1)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Similar cards */}
      {similar.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">
            More from {card.set}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {similar.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/collection/${c.id}`)}
                className="group flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <CardArt src={c.image} alt={c.name} sizes="20vw" />
                <div className="flex flex-col gap-0.5 px-1 pb-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {c.name}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    {formatCurrency(c.marketPrice)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
