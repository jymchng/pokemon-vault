"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Package,
  Minus,
  Plus,
  Gift,
  Info,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { usePacks } from "@/lib/hooks/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/ui/price-tag";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { useCartStore } from "@/lib/store/cart-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { PackOpenStage } from "@/components/packs/pack-open-stage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { BoosterPack } from "@/lib/types";

function PackInfoPanel({
  pack,
  quantity,
  setQuantity,
}: {
  pack: BoosterPack;
  quantity: number;
  setQuantity: (n: number) => void;
}) {
  const addToCart = useCartStore((s) => s.addItem);
  const signedIn = useAuthStore((s) => s.signedIn);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);
  const [turbo, setTurbo] = useState(false);
  const [buyback, setBuyback] = useState(false);

  const total = pack.price * quantity;

  const handleBuy = async () => {
    if (!signedIn) {
      setSignInOpen(true);
      return;
    }
    try {
      await addToCart(
        {
          productId: pack.slug,
          name: `${pack.name} Booster Pack`,
          image: pack.image,
          price: pack.price,
        },
        quantity,
      );
      toast.success(`Added ${quantity} × ${pack.name} pack to cart`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Add to cart failed");
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {pack.name}
          </h2>
          <Badge
            variant={pack.availability === "In Stock" ? "success" : "warning"}
          >
            {pack.availability}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{pack.tagline}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-elevated p-3">
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">
            PRICE / PACK
          </span>
          <PriceTag price={pack.price} />
        </div>
        <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-elevated p-3">
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">
            CARDS / PACK
          </span>
          <span className="text-base font-semibold text-foreground">
            {pack.cardsPerPack} cards
          </span>
        </div>
      </div>

      {/* Quantity stepper */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Packs</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            aria-label="Fewer packs"
          >
            <Minus />
          </Button>
          <span className="w-8 text-center text-base font-semibold tabular-nums text-foreground">
            {quantity}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setQuantity(Math.min(10, quantity + 1))}
            aria-label="More packs"
          >
            <Plus />
          </Button>
        </div>
      </div>

      {/* Totals */}
      <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-elevated p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">You pay</span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      <Button onClick={handleBuy} className="w-full">
        <Package /> Buy {quantity > 1 ? `${quantity} Packs` : "Pack"}
      </Button>

      {/* Toggles */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-foreground">Turbo</span>
            <span className="text-[11px] text-muted-foreground">
              Auto-sell common pulls for store credit
            </span>
          </div>
          <Switch
            checked={turbo}
            onCheckedChange={setTurbo}
            aria-label="Turbo auto-sell"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-foreground">
              Instant buyback
            </span>
            <span className="text-[11px] text-muted-foreground">
              Sell any pull back within 3 days
            </span>
          </div>
          <Switch
            checked={buyback}
            onCheckedChange={setBuyback}
            aria-label="Instant buyback"
          />
        </div>
      </div>

      <button className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded">
        <Info className="size-3.5" /> Statistics & odds
      </button>
    </div>
  );
}

export default function PacksPage() {
  const { data: allPacks, isLoading } = usePacks();
  const packs = useMemo(() => allPacks ?? [], [allPacks]);
  const [activeSlug, setActiveSlug] = useState("");
  const [quantity, setQuantity] = useState(1);
  const activePack = useMemo(
    () =>
      (activeSlug ? packs.find((p) => p.slug === activeSlug) : packs[0]) ??
      packs[0],
    [activeSlug, packs],
  );
  const [openingPack, setOpeningPack] = useState<BoosterPack | null>(null);

  const activeIndex = packs.findIndex((p) => p.slug === activePack?.slug);
  const selectRelative = (dir: -1 | 1) => {
    const next = (activeIndex + dir + packs.length) % packs.length;
    setActiveSlug(packs[next].slug);
    setQuantity(1);
  };

  if (isLoading || packs.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Booster Packs"
          subtitle="Open a pack and discover your next favorite card."
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="skeleton h-96 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Booster Packs"
        subtitle="Open a pack and discover your next favorite card."
      />

      {/* Pack tier strip (reference carousel nav) */}
      <div className="subnav-strip -mx-5 px-5 pb-1">
        {packs.map((p) => (
          <button
            key={p.slug}
            onClick={() => {
              setActiveSlug(p.slug);
              setQuantity(1);
            }}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              activeSlug === p.slug
                ? "border-accent-lime/50 bg-accent-lime/10 text-accent-lime"
                : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
            aria-pressed={activeSlug === p.slug}
          >
            {p.name}
            <span className="text-[10px] text-muted-foreground">
              {formatCurrency(p.price)}
            </span>
          </button>
        ))}
      </div>

      {/* Pack stage + info */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Pack stage */}
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => selectRelative(-1)}
              aria-label="Previous pack"
            >
              <ChevronLeft />
            </Button>
            <div className="relative aspect-[2.5/3.5] w-44 overflow-hidden rounded-xl border border-border-strong shadow-elevated">
              <div className="absolute inset-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activePack.image}
                  alt={`${activePack.name} booster pack`}
                  className="size-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
                <p className="text-center text-sm font-semibold text-white">
                  {activePack.name}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => selectRelative(1)}
              aria-label="Next pack"
            >
              <ChevronRight />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {activePack.cardsPerPack} cards per pack ·{" "}
            {formatCurrency(activePack.price)}
          </p>

          <Button size="sm" onClick={() => setOpeningPack(activePack)}>
            <Package /> Open Pack
          </Button>
        </div>

        {/* Pack info panel */}
        <PackInfoPanel
          pack={activePack}
          quantity={quantity}
          setQuantity={setQuantity}
        />
      </div>

      {/* What's Inside + odds */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          What&apos;s Inside?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(activePack.contents ?? []).map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 text-sm text-foreground"
            >
              <Sparkles className="size-4 shrink-0 text-primary" />
              {item}
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-border-strong p-3 text-xs text-muted-foreground">
            <Info className="size-4 shrink-0" />
            Pull rates: {activePack.odds.common}% Common ·{" "}
            {activePack.odds.ultraRare}% Ultra Rare
          </div>
        </div>
      </section>

      {/* Guaranteed authenticity */}
      <section className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <ShieldCheck className="size-5 text-success" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">
            Guaranteed Authenticity
          </span>
          <span className="text-xs text-muted-foreground">
            Every card pulled is authenticated and graded before shipment. 100%
            guarantee or your money back.
          </span>
        </div>
      </section>

      {/* Gift a pack */}
      <section className="flex items-center justify-between rounded-2xl border border-dashed border-border-strong p-5">
        <div className="flex items-center gap-3">
          <Gift className="size-5 text-primary" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              Gift a pack
            </span>
            <span className="text-xs text-muted-foreground">
              Send a booster pack to a fellow collector.
            </span>
          </div>
        </div>
        <Button variant="secondary" size="sm">
          Gift
        </Button>
      </section>

      {/* Open pack dialog */}
      <Dialog
        open={openingPack !== null}
        onOpenChange={(open) => {
          if (!open) setOpeningPack(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="size-4 text-primary" />
              {openingPack ? `Open ${openingPack.name}` : "Open Pack"}
            </DialogTitle>
            <DialogDescription>
              {openingPack
                ? `${openingPack.cardsPerPack} cards per pack — cards are added to your collection server-side`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {openingPack && (
            <PackOpenStage
              pack={openingPack}
              onDone={() => setOpeningPack(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
