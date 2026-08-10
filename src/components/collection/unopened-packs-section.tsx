"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, Sparkles } from "lucide-react";
import { packs as catalogPacks } from "@/lib/data/packs";
import { usePackInventoryStore } from "@/lib/store/pack-inventory-store";
import { PackOpenStage } from "@/components/packs/pack-open-stage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BoosterPack } from "@/lib/types";

export function UnopenedPacksSection() {
  const inventory = usePackInventoryStore((s) => s.packs);
  const [opening, setOpening] = useState<BoosterPack | null>(null);

  const owned = inventory
    .map((entry) => ({
      quantity: entry.quantity,
      pack: catalogPacks.find((p) => p.slug === entry.slug),
    }))
    .filter(
      (entry): entry is { quantity: number; pack: BoosterPack } =>
        Boolean(entry.pack) && entry.quantity > 0,
    );

  const totalPacks = owned.reduce((a, e) => a + e.quantity, 0);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-foreground">
            Unopened Packs
          </h2>
          <p className="text-xs text-muted-foreground">
            {totalPacks > 0
              ? `${totalPacks} pack${totalPacks === 1 ? "" : "s"} ready to open — 5 cards each.`
              : "Packs you've purchased land here, ready to open."}
          </p>
        </div>
        {totalPacks > 0 && (
          <Link
            href="/packs"
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            Buy more →
          </Link>
        )}
      </div>

      {owned.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong px-6 py-10 text-center">
          <Package className="size-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No unopened packs yet — buy a booster pack and it&apos;ll show up
            here.
          </p>
          <Button
            size="sm"
            variant="secondary"
            render={<Link href="/packs" />}
            nativeButton={false}
          >
            Browse Packs
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {owned.map(({ pack, quantity }) => (
            <div
              key={pack.slug}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3"
            >
              <div className="relative overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pack.image}
                  alt={`${pack.name} booster pack`}
                  className="aspect-[2.5/3.5] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <Badge variant="outline" className="absolute top-2 right-2">
                  ×{quantity}
                </Badge>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="truncate text-xs font-semibold text-foreground">
                  {pack.name}
                </p>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => setOpening(pack)}
                >
                  <Sparkles className="size-3.5" /> Open Pack
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={opening !== null}
        onOpenChange={(open) => {
          if (!open) setOpening(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="size-4 text-primary" />
              {opening ? `Open ${opening.name}` : "Open Pack"}
            </DialogTitle>
            <DialogDescription>
              {opening
                ? `${opening.cardsPerPack} cards · ${opening.odds.common}% Common, ${opening.odds.uncommon}% Uncommon, ${opening.odds.rare}% Rare, ${opening.odds.ultraRare}% Ultra Rare`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {opening && (
            <PackOpenStage pack={opening} onDone={() => setOpening(null)} />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
