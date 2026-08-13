"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Filter, SlidersHorizontal, Search, Package, LogIn } from "lucide-react";
import { useCards, useCollectionItems, useCollectionSets } from "@/lib/hooks/queries";
import {
  SET_FILTERS,
  RARITY_FILTERS,
  GRADE_FILTERS,
  TYPE_FILTERS,
} from "@/lib/types";
import { PokemonCardTile } from "@/components/cards/pokemon-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RewardProgress } from "@/components/rewards/reward-progress";
import { FilterPills, type FilterPill } from "@/components/ui/filter-pills";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SkeletonGrid } from "@/components/ui/skeleton-card";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PokemonCard, Rarity, Grade } from "@/lib/types";

type SortKey =
  | "value_desc"
  | "value_asc"
  | "name_asc"
  | "grade_desc"
  | "recent";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "value_desc", label: "Value: high to low" },
  { key: "value_asc", label: "Value: low to high" },
  { key: "name_asc", label: "Name: A to Z" },
  { key: "grade_desc", label: "Grade: high to low" },
  { key: "recent", label: "Recently acquired" },
];

function CollectionStats({ ownedCards }: { ownedCards: PokemonCard[] }) {
  const totalCards = ownedCards.reduce((a, c) => a + c.quantity, 0);
  const setCount = new Set(ownedCards.map((c) => c.set)).size;
  const rareCount = ownedCards.filter(
    (c) =>
      c.rarity === "Special Illustration Rare" || c.rarity === "Secret Rare",
  ).length;
  const totalValue = ownedCards.reduce(
    (a, c) => a + c.marketPrice * c.quantity,
    0,
  );

  const stats = [
    { label: "COLLECTED", value: `${totalCards} cards` },
    { label: "SETS", value: `${setCount}` },
    { label: "RARE CARDS", value: `${rareCount}` },
    { label: "COLLECTION VALUE", value: formatCurrency(totalValue) },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-0.5 bg-surface p-4">
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">
            {stat.label}
          </span>
          <span className="text-base font-semibold tabular-nums text-foreground">
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CollectionPage() {
  const router = useRouter();
  const signedIn = useAuthStore((s) => s.signedIn);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);

  const [query, setQuery] = useState("");
  const [setFilter, setSetFilter] = useState("All Sets");
  const [rarityFilter, setRarityFilter] = useState("All Rarities");
  const [gradeFilter, setGradeFilter] = useState("Any Grade");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [sortKey, setSortKey] = useState<SortKey>("value_desc");

  const { data: allCards = [] } = useCards();
  const { data: collectionItems = [], isLoading, isError } = useCollectionItems();
  const { data: setProgress = [] } = useCollectionSets();

  const byId = useMemo(
    () => new Map(allCards.map((c) => [c.id, c])),
    [allCards],
  );

  // Join backend collection items with catalog card details.
  const ownedCards: PokemonCard[] = useMemo(
    () =>
      collectionItems.map((item) => {
        const card = byId.get(item.cardId);
        const base: PokemonCard = card ?? {
          id: item.cardId,
          name: item.cardName,
          set: item.setName,
          cardNumber: item.cardNumber ?? "",
          rarity: (item.rarity as Rarity) ?? "Common",
          type: "Colorless",
          grade: (item.grade as Grade) ?? "Ungraded",
          condition: "Mint",
          image: "/images/placeholder-card.png",
          owned: true,
          quantity: item.quantity,
          acquiredAt: item.acquiredAt ?? new Date().toISOString(),
          marketPrice: 0,
        };
        return { ...base, owned: true, quantity: item.quantity };
      }),
    [collectionItems, byId],
  );

  const activePills: FilterPill[] = useMemo(() => {
    const pills: FilterPill[] = [];
    if (setFilter !== "All Sets") pills.push({ key: "set", label: setFilter });
    if (rarityFilter !== "All Rarities")
      pills.push({ key: "rarity", label: rarityFilter });
    if (gradeFilter !== "Any Grade")
      pills.push({ key: "grade", label: gradeFilter });
    if (typeFilter !== "All Types")
      pills.push({ key: "type", label: typeFilter });
    if (query) pills.push({ key: "query", label: `"${query}"` });
    return pills;
  }, [setFilter, rarityFilter, gradeFilter, typeFilter, query]);

  const removePill = useCallback((key: string) => {
    switch (key) {
      case "set":
        setSetFilter("All Sets");
        break;
      case "rarity":
        setRarityFilter("All Rarities");
        break;
      case "grade":
        setGradeFilter("Any Grade");
        break;
      case "type":
        setTypeFilter("All Types");
        break;
      case "query":
        setQuery("");
        break;
    }
  }, []);

  const clearAll = useCallback(() => {
    setSetFilter("All Sets");
    setRarityFilter("All Rarities");
    setGradeFilter("Any Grade");
    setTypeFilter("All Types");
    setQuery("");
  }, []);

  const filtered = useMemo(() => {
    let list = ownedCards.filter((c) => {
      if (setFilter !== "All Sets" && c.set !== setFilter) return false;
      if (
        rarityFilter !== "All Rarities" &&
        c.rarity !== (rarityFilter as Rarity)
      )
        return false;
      if (gradeFilter !== "Any Grade" && c.grade !== (gradeFilter as Grade))
        return false;
      if (typeFilter !== "All Types" && c.type !== typeFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.set.toLowerCase().includes(q) ||
          c.cardNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "value_desc":
          return b.marketPrice - a.marketPrice;
        case "value_asc":
          return a.marketPrice - b.marketPrice;
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "grade_desc": {
          const g = (x: PokemonCard) =>
            x.grade === "Ungraded"
              ? 0
              : parseInt(x.grade.replace(/\D/g, ""), 10) || 0;
          return g(b) - g(a);
        }
        case "recent":
          return (
            new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime()
          );
        default:
          return 0;
      }
    });
    return list;
  }, [ownedCards, setFilter, rarityFilter, gradeFilter, typeFilter, query, sortKey]);

  const handleView = useCallback(
    (id: string) => {
      router.push(`/collection/${id}`);
    },
    [router],
  );

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Collection"
          subtitle="View and manage the Pokémon cards and collectibles you own."
        />
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
            <LogIn className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Sign in to view your collection
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your collection is stored server-side — sign in to see the cards
            you own, set progress, and collection stats.
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
      {/* Header */}
      <PageHeader
        title="Collection"
        subtitle="View and manage the Pokémon cards and collectibles you own."
      />

      {/* Stats row */}
      <CollectionStats ownedCards={ownedCards} />

      {/* Tabs */}
      <div
        className="inline-flex w-fit items-center gap-1 rounded-full bg-muted p-1"
        role="tablist"
        aria-label="Collection sections"
      >
        <span className="inline-flex h-7 items-center justify-center rounded-full bg-accent-lime/10 px-3 text-xs font-medium whitespace-nowrap text-accent-lime">
          Cards
        </span>
        <Link
          href="/collection/activity"
          className="inline-flex h-7 items-center justify-center rounded-full px-3 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
        >
          Activity
        </Link>
        <Link
          href="/collection/shipping"
          className="inline-flex h-7 items-center justify-center rounded-full px-3 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
        >
          Shipping
        </Link>
      </div>

      {/* Set completion */}
      {setProgress.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            Set Progress
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {setProgress.map((s) => (
              <div
                key={s.setId}
                className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {s.setName}
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    {Math.round(s.completionPercentage)}%
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${s.completionPercentage}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {s.ownedCards}/{s.totalCards} cards
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rewards progress */}
      <RewardProgress
        xp={0}
        currentLevelXp={0}
        nextLevelXp={2000}
        nextRewardLabel="1 Free Booster Pack"
      />

      {/* Search + filters + sort */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Pokémon, set, or card number"
            className="h-[38px] rounded-lg bg-surface pl-9"
            aria-label="Search your collection"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground"
                >
                  <Filter className="size-3.5" /> Filters
                </Button>
              }
            >
              <span className="sr-only">Filters</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <div className="flex flex-col gap-3 p-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    Set
                  </span>
                  <select
                    value={setFilter}
                    onChange={(e) => setSetFilter(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-elevated px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/60"
                    aria-label="Filter by set"
                  >
                    {SET_FILTERS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    Rarity
                  </span>
                  <select
                    value={rarityFilter}
                    onChange={(e) => setRarityFilter(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-elevated px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/60"
                    aria-label="Filter by rarity"
                  >
                    {RARITY_FILTERS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    Grade
                  </span>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-elevated px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/60"
                    aria-label="Filter by grade"
                  >
                    {GRADE_FILTERS.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-foreground">
                    Type
                  </span>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-elevated px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/60"
                    aria-label="Filter by type"
                  >
                    {TYPE_FILTERS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground"
                >
                  <SlidersHorizontal className="size-3.5" />
                  {sortOptions.find((o) => o.key === sortKey)?.label}
                </Button>
              }
            >
              <span className="sr-only">Sort cards</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {sortOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.key}
                  onClick={() => setSortKey(opt.key)}
                  className={cn(
                    "text-xs",
                    sortKey === opt.key && "bg-secondary text-primary",
                  )}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <FilterPills
          pills={activePills}
          onRemove={removePill}
          onClearAll={clearAll}
        />
      </div>

      {/* Card grid */}
      {isLoading ? (
        <SkeletonGrid count={10} className="mt-4" />
      ) : isError ? (
        <EmptyState
          icon={<Package className="size-6" />}
          title="Failed to load your collection"
          description="Something went wrong fetching your cards. Please try again."
          className="mt-4"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="size-6" />}
          title="No cards found"
          description="Try adjusting your search or filters to find what you're looking for."
          className="mt-4"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((card) => (
            <PokemonCardTile
              key={card.id}
              card={card}
              onView={handleView}
              onWishlist={() => {}}
              onAddToCart={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
