"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Layers, Package, Grid3X3, TrendingUp } from "lucide-react";
import { useUiStore } from "@/lib/store/ui-store";
import { useCards } from "@/lib/hooks/queries";
import { useProducts } from "@/lib/hooks/queries";
import { usePacks } from "@/lib/hooks/queries";
import { useSets } from "@/lib/hooks/queries";
import { recentSearches } from "@/lib/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function SearchOverlay() {
  const open = useUiStore((s) => s.searchOpen);
  const setOpen = useUiStore((s) => s.setSearchOpen);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: cards } = useCards();
  const { data: products } = useProducts();
  const { data: packs } = usePacks();
  const { data: sets } = useSets();

  // Keyboard shortcut: '/' opens, Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !open &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return null;
    return {
      cards: (cards ?? [])
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.set.toLowerCase().includes(q) ||
            c.cardNumber.toLowerCase().includes(q),
        )
        .slice(0, 4),
      products: (products ?? [])
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) || p.set.toLowerCase().includes(q),
        )
        .slice(0, 4),
      packs: (packs ?? [])
        .filter((p) => p.name.toLowerCase().includes(q))
        .slice(0, 3),
      sets: (sets ?? [])
        .filter((s) => s.name.toLowerCase().includes(q))
        .slice(0, 3),
    };
  }, [query, cards, products, packs, sets]);

  if (!open) return null;

  const total = results
    ? results.cards.length +
      results.products.length +
      results.packs.length +
      results.sets.length
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-20 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Pokémon, cards, sets..."
            className="h-9 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
            aria-label="Search Pokémon, cards, sets"
          />
          <button
            onClick={() => setOpen(false)}
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            aria-label="Close search"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {!query ? (
            <div className="flex flex-col gap-3">
              <p className="px-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                Recent searches
              </p>
              <div className="flex flex-wrap gap-2 px-1">
                {recentSearches.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="rounded-full border border-border bg-elevated px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {results!.cards.length > 0 && (
                <Group label="Cards">
                  {results!.cards.map((c) => (
                    <ResultRow
                      key={c.id}
                      icon={<Layers className="size-3.5 text-primary" />}
                      title={c.name}
                      subtitle={`${c.set} · ${c.rarity}`}
                      onClick={() => {
                        setOpen(false);
                        router.push(`/collection/${c.id}`);
                      }}
                    />
                  ))}
                </Group>
              )}
              {results!.products.length > 0 && (
                <Group label="Products">
                  {results!.products.map((p) => (
                    <ResultRow
                      key={p.id}
                      icon={
                        <TrendingUp className="size-3.5 text-accent-blue" />
                      }
                      title={p.name}
                      subtitle={`${p.set} · ${p.category}`}
                      onClick={() => {
                        setOpen(false);
                        router.push(`/store?product=${p.id}`);
                      }}
                    />
                  ))}
                </Group>
              )}
              {results!.packs.length > 0 && (
                <Group label="Booster Packs">
                  {results!.packs.map((p) => (
                    <ResultRow
                      key={p.slug}
                      icon={<Package className="size-3.5 text-accent-purple" />}
                      title={`${p.name} Booster Pack`}
                      subtitle={`$${p.price.toFixed(2)} · ${p.cardsPerPack} cards`}
                      onClick={() => {
                        setOpen(false);
                        router.push(`/packs/${p.slug}`);
                      }}
                    />
                  ))}
                </Group>
              )}
              {results!.sets.length > 0 && (
                <Group label="Sets">
                  {results!.sets.map((s) => (
                    <ResultRow
                      key={s.id}
                      icon={<Grid3X3 className="size-3.5 text-success" />}
                      title={s.name}
                      subtitle={`${s.collected}/${s.totalCards} collected`}
                      onClick={() => {
                        setOpen(false);
                        router.push(`/sets/${s.id}`);
                      }}
                    />
                  ))}
                </Group>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}

function ResultRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-elevated">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">
          {title}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {subtitle}
        </span>
      </span>
      <Badge variant="ghost">Go</Badge>
    </button>
  );
}
