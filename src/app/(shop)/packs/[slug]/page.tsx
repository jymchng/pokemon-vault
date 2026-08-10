"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Minus,
  Plus,
  Info,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { packs, latestPulls, getPackBySlug } from "@/lib/data/packs";
import { usePack, useLatestPulls } from "@/lib/hooks/queries";
import { PackOpenStage } from "@/components/packs/pack-open-stage";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriceTag, ValueDelta } from "@/components/ui/price-tag";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils/format";
import { useCartStore } from "@/lib/store/cart-store";
import { toast } from "sonner";

const graderVariant = {
  PSA: "psa",
  CGC: "cgc",
  BECKETT: "bgs",
} as const;

function graderBadge(grader: string) {
  return graderVariant[grader as keyof typeof graderVariant] ?? "outline";
}

export default function PackDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: packData } = usePack(slug);
  const { data: pullData } = useLatestPulls();
  const pack = packData ?? getPackBySlug(slug);
  const pulls = pullData ?? latestPulls;
  const [quantity, setQuantity] = useState(1);
  const [turbo, setTurbo] = useState(false);
  const [buyback, setBuyback] = useState(false);
  const addToCart = useCartStore((s) => s.addItem);

  if (!pack) {
    return (
      <EmptyState
        icon={<Info className="size-6" />}
        title="Pack not found"
        description="This booster pack isn't in the catalog."
        primaryAction={
          <Button render={<Link href="/packs" />} nativeButton={false}>
            Browse Packs
          </Button>
        }
      />
    );
  }

  const total = pack.price * quantity;
  const ev = pack.price * 1.065;

  const handleBuy = () => {
    addToCart(
      {
        productId: pack.slug,
        name: `${pack.name} Booster Pack`,
        image: pack.image,
        price: pack.price,
      },
      quantity,
    );
    toast.success(`Added ${quantity} × ${pack.name} pack to cart`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        render={<Link href="/packs" />}
        nativeButton={false}
      >
        <ArrowLeft className="size-3.5" /> All Packs
      </Button>

      <PageHeader title={pack.name} subtitle={pack.tagline} />

      {/* Pack stage + info */}
      <div className="grid gap-5 lg:grid-cols-2">
        <PackOpenStage pack={pack} onDone={() => {}} />

        {/* Info panel */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {pack.name} Pack
            </h2>
            <Badge
              variant={pack.availability === "In Stock" ? "success" : "warning"}
            >
              {pack.availability}
            </Badge>
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
            <span className="text-sm font-medium text-muted-foreground">
              Packs
            </span>
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

          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-elevated p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Expected value / pack
              </span>
              <span className="font-semibold text-success">
                {formatCurrency(ev)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">You pay</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <Button size="lg" onClick={handleBuy} className="w-full">
            Buy {quantity > 1 ? `${quantity} Packs` : "Pack"}
          </Button>

          {/* Toggles */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-foreground">
                  Turbo
                </span>
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
      </div>

      {/* What's Inside */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          What&apos;s Inside?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pack.contents.map((item) => (
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
            Pull rates: {pack.odds.common}% Common · {pack.odds.ultraRare}%
            Ultra Rare
          </div>
        </div>
      </section>

      {/* Latest pulls */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Latest Pulls
          </h2>
          <Link
            href="/collection/activity"
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            View activity →
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {pulls.map((pull) => (
            <div
              key={pull.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Sparkles className="size-4 text-primary" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-sm font-medium text-foreground">
                  {pull.title}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant={graderBadge(pull.grader)}>
                    {pull.grader}
                  </Badge>
                  <ValueDelta delta={pull.delta} />
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {pull.value.toLocaleString()}
              </span>
            </div>
          ))}
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

      {/* Other packs */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">Other Packs</h2>
        <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
          {packs
            .filter((p) => p.slug !== pack.slug)
            .map((p) => (
              <Link
                key={p.slug}
                href={`/packs/${p.slug}`}
                className="flex w-36 shrink-0 flex-col gap-2 rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-primary/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.name}
                  className="aspect-[2.5/3.5] w-full rounded-lg border border-border object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="flex flex-col gap-0.5">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {p.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatCurrency(p.price)}
                  </p>
                </div>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
