"use client";

import Link from "next/link";
import {
  Sparkles,
  Package,
  ShieldCheck,
  Truck,
  Trophy,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/products/product-card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/page-header";
import { RewardProgress } from "@/components/rewards/reward-progress";
import { useProducts, useSets } from "@/lib/hooks/queries";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useRewardsStore } from "@/lib/store/rewards-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/format";

const reasons = [
  {
    icon: ShieldCheck,
    title: "Authenticated Grading",
    description:
      "Every graded card is verified by PSA, CGC, or Beckett before listing.",
  },
  {
    icon: Truck,
    title: "Fast, Insured Shipping",
    description:
      "Sealed and tracked delivery on every order, with full insurance.",
  },
  {
    icon: Trophy,
    title: "Collector Rewards",
    description:
      "Earn XP on every purchase and unlock exclusive collector rewards.",
  },
  {
    icon: Sparkles,
    title: "Curated Selection",
    description:
      "Hand-picked singles, sealed product, and accessories from trusted sources.",
  },
];

export default function Home() {
  const addToCart = useCartStore((s) => s.addItem);
  const wishlistIds = useWishlistStore((s) => s.ids);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const xp = useRewardsStore((s) => s.xp);
  const level = useRewardsStore((s) => s.level);
  const signedIn = useAuthStore((s) => s.signedIn);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);

  const { data: products = [] } = useProducts();
  const { data: sets = [] } = useSets();

  const trending = products.filter((p) => p.trending).slice(0, 4);
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const latestSets = sets.slice(0, 4);
  const firstPack = products.find((p) => p.category === "Booster Pack");

  const handleAddToCart = async (id: string) => {
    const p = products.find((prod) => prod.id === id);
    if (!p || p.availability === "Sold Out") return;
    if (!signedIn) {
      setSignInOpen(true);
      return;
    }
    try {
      await addToCart({
        productId: p.id,
        name: p.name,
        image: p.image,
        price: p.price,
      });
      toast.success(`Added ${p.name} to cart`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Add to cart failed");
    }
  };

  const handleWishlist = async (id: string) => {
    const p = products.find((prod) => prod.id === id);
    if (!signedIn) {
      setSignInOpen(true);
      return;
    }
    try {
      await toggleWishlist(id);
      toast.success(
        wishlistIds.includes(id)
          ? `Removed ${p?.name ?? "item"} from wishlist`
          : `Added ${p?.name ?? "item"} to wishlist`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wishlist update failed");
    }
  };

  return (
    <div className="flex flex-col gap-12 pb-6">
      {/* Hero */}
      <section className="relative flex min-h-[340px] flex-col items-center justify-center gap-5 overflow-hidden rounded-[1rem] border border-border bg-surface px-6 py-16 text-center">
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent-lime/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-accent-blue/10 blur-3xl" />
        <div className="relative flex size-14 items-center justify-center rounded-2xl bg-secondary">
          <Sparkles className="size-7 text-primary" />
        </div>
        <h1 className="relative max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Build Your Pokémon Collection
        </h1>
        <p className="relative max-w-md text-sm leading-relaxed text-muted-foreground">
          Discover cards, open packs, and find your next favorite Pokémon.
        </p>
        <div className="relative mt-1 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            render={<Link href="/store" />}
            nativeButton={false}
          >
            Shop Cards
          </Button>
          <Button
            variant="outline"
            size="lg"
            render={<Link href="/packs" />}
            nativeButton={false}
          >
            <Package /> Explore Packs
          </Button>
        </div>
      </section>

      {/* Trending Now */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Trending Now"
          subtitle="What collectors are chasing this week"
          action={
            <Link
              href="/store"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              View all <ChevronRight className="size-3.5" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {trending.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onView={() => {}}
              onAddToCart={handleAddToCart}
              onWishlist={handleWishlist}
              wishlisted={wishlistIds.includes(p.id)}
            />
          ))}
        </div>
      </section>

      {/* Featured Cards */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Featured Cards"
          subtitle="Premium graded highlights"
          action={
            <Link
              href="/store?category=Graded+Card"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              Graded cards <ChevronRight className="size-3.5" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onView={() => {}}
              onAddToCart={handleAddToCart}
              onWishlist={handleWishlist}
              wishlisted={wishlistIds.includes(p.id)}
            />
          ))}
        </div>
      </section>

      {/* Latest Sets */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Latest Sets"
          subtitle="Track your set completion"
          action={
            <Link
              href="/sets"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              All sets <ChevronRight className="size-3.5" />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {latestSets.map((set) => {
            const pct =
              set.totalCards > 0
                ? Math.round((set.collected / set.totalCards) * 100)
                : 0;
            return (
              <Link
                key={set.id}
                href={`/sets/${set.id}`}
                className="group flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    {set.symbol}
                  </span>
                  <Badge variant="outline">{set.releaseYear}</Badge>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {set.name}
                </p>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {set.collected}/{set.totalCards} cards
                    </span>
                    <span className="font-semibold text-primary">{pct}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-elevated">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Collector Rewards */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Collector Rewards"
          subtitle="Earn XP and unlock rewards as you collect"
          action={
            <Link
              href="/rewards"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              View rewards <ChevronRight className="size-3.5" />
            </Link>
          }
        />
        <RewardProgress
          xp={xp}
          currentLevelXp={(level - 1) * 500}
          nextLevelXp={level * 500}
          nextRewardLabel="1 Free Booster Pack"
        />
      </section>

      {/* Why Pokémon Vault? */}
      <section className="flex flex-col gap-4">
        <SectionHeader title="Why Pokémon Vault?" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason) => {
            const Icon = reason.icon;
            return (
              <div
                key={reason.title}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-secondary">
                  <Icon className="size-4.5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {reason.title}
                </span>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {reason.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pack CTA */}
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Ready to open your first pack?{" "}
          <span className="font-semibold text-foreground">
            {firstPack
              ? `${firstPack.name} packs from ${formatCurrency(firstPack.price)}`
              : "Booster packs are live"}
          </span>
        </p>
        <Button size="lg" render={<Link href="/packs" />} nativeButton={false}>
          <Package /> Explore Booster Packs
        </Button>
      </section>
    </div>
  );
}
