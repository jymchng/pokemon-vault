"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { useSets, useCards } from "@/lib/hooks/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function SetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: sets, isLoading: setsLoading } = useSets();
  const { data: cards, isLoading: cardsLoading } = useCards();
  const [view, setView] = useState<"all" | "owned" | "missing">("all");

  const set = (sets ?? []).find((s) => s.id === id);
  const setCards = useMemo(
    () => (cards ?? []).filter((c) => c.set === set?.name),
    [cards, set],
  );
  const ownedCount = setCards.filter((c) => c.owned).length;
  const pct = set ? Math.round((set.collected / set.totalCards) * 100) : 0;

  if (setsLoading || cardsLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-8 w-56 rounded-lg" />
        <div className="skeleton h-40 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[2.5/3.5] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!set) {
    return (
      <EmptyState
        icon={<Layers className="size-6" />}
        title="Set not found"
        description="This Pokémon set doesn't exist in our catalog."
        primaryAction={
          <Button render={<Link href="/sets" />} nativeButton={false}>
            Back to Sets
          </Button>
        }
      />
    );
  }

  const filtered = setCards.filter((c) => {
    if (view === "owned") return c.owned;
    if (view === "missing") return !c.owned;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        render={<Link href="/sets" />}
        nativeButton={false}
      >
        <ArrowLeft className="size-3.5" /> All Sets
      </Button>

      <PageHeader
        title={set.name}
        subtitle={`${set.symbol} · ${set.releaseYear} · ${set.totalCards} cards`}
        actions={
          <Badge variant={pct >= 100 ? "success" : "outline"}>
            {pct >= 100 ? "Complete" : `${pct}% Complete`}
          </Badge>
        }
      />

      {/* Progress */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {ownedCount} / {set.totalCards} cards collected
          </span>
          <span className="font-semibold text-primary">{pct}%</span>
        </div>
        <Progress value={pct} className="[&_[data-slot=progress-track]]:h-2.5">
          <span className="sr-only">{pct}%</span>
        </Progress>
      </section>

      {/* View toggle */}
      <div
        className="flex w-fit items-center gap-1 rounded-full border border-border bg-elevated p-0.5"
        role="tablist"
        aria-label="Set card view"
      >
        {(
          [
            { key: "all", label: "All" },
            { key: "owned", label: "Show Owned" },
            { key: "missing", label: "Show Missing" },
          ] as const
        ).map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            role="tab"
            aria-selected={view === v.key}
            className={cn(
              "h-7 rounded-full px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              view === v.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Layers className="size-6" />}
          title="No cards in this view"
          description={
            view === "owned"
              ? "You haven't collected any cards from this set yet."
              : "All cards in this set are collected!"
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((card) => (
            <Link
              key={card.id}
              href={`/collection/${card.id}`}
              className={cn(
                "flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2.5 transition-all",
                card.owned
                  ? "hover:border-primary/40 hover:shadow-elevated"
                  : "opacity-45 grayscale",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.image}
                alt={card.name}
                className="aspect-[2.5/3.5] w-full rounded-xl border border-border object-cover"
              />
              <div className="flex flex-col gap-0.5 px-1 pb-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {card.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  #{card.cardNumber} · {card.rarity}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
