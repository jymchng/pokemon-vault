"use client";

import Link from "next/link";
import { Layers, ChevronRight } from "lucide-react";
import { useSets } from "@/lib/hooks/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { SkeletonGrid } from "@/components/ui/skeleton-card";
import { Progress } from "@/components/ui/progress";

export default function SetsPage() {
  const { data: sets, isLoading } = useSets();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sets"
        subtitle="Track your collection progress across every Pokémon set."
      />

      {isLoading ? (
        <SkeletonGrid count={6} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(sets ?? []).map((set) => {
            const pct = Math.round((set.collected / set.totalCards) * 100);
            const completed = set.collected >= set.totalCards;
            return (
              <Link
                key={set.id}
                href={`/sets/${set.id}`}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-secondary">
                    <Layers className="size-5 text-primary" />
                  </div>
                  <Badge variant={completed ? "success" : "outline"}>
                    {completed ? "Complete" : set.releaseYear}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    {set.name}
                  </span>
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    {set.symbol}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {set.collected}/{set.totalCards} cards
                    </span>
                    <span className="font-semibold text-primary">{pct}%</span>
                  </div>
                  <Progress
                    value={pct}
                    className="[&_[data-slot=progress-track]]:h-1.5"
                  >
                    <span className="sr-only">{pct}%</span>
                  </Progress>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors group-hover:text-primary/80">
                  View set <ChevronRight className="size-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
