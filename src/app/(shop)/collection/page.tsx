"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Filter, SlidersHorizontal, Search, Package } from "lucide-react";
import { useCards } from "@/lib/hooks/queries";
import { getCardById } from "@/lib/data/cards";
import {
  setFilters,
  rarityFilters,
  gradeFilters,
  typeFilters,
} from "@/lib/data/sets";
import { PokemonCardTile } from "@/components/cards/pokemon-card";
import { CardArt } from "@/components/cards/card-art";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RewardProgress } from "@/components/rewards/reward-progress";
import { UnopenedPacksSection } from "@/components/collection/unopened-packs-section";
import { FilterPills, type FilterPill } from "@/components/ui/filter-pills";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SkeletonGrid } from "@/components/ui/skeleton-card";
import { formatCurrency, rarityVariant } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PokemonCard, Rarity, Grade } from "@/lib/types";

type SortKey =
  "value_desc" | "value_asc" | "name_asc" | "grade_desc" | "recent";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "value_desc", label: "Value: high to low" },
  { key: "value_asc", label: "Value: low to high" },
  { key: "name_asc", label: "Name: A to Z" },
  { key: "grade_desc", label: "Grade: high to low" },
  { key: "recent", label: "Recently acquired" },
];

const highlights = ["card-007", "card-001", "card-003", "card-002"];

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

function CollectionHighlights({ onView }: { onView: (id: string) => void }) {
  const highlightCards = highlights
    .map((id) => getCardById(id))
    .filter((c): c is PokemonCard => Boolean(c));

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-foreground">
            Collection Highlights
          </h2>
          <p className="text-xs text-muted-foreground">
            Your latest and rarest Pokémon discoveries.
          </p>
        </div>
        <Link
          href="/packs"
          className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          Open a pack →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {highlightCards.map((card) => (
          <button
            key={card.id}
            onClick={() => onView(card.id)}
            className="group relative overflow-hidden rounded-2xl border border-border bg-surface text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label={`View ${card.name}`}
          >
            <div className="relative">
              <CardArt
                src={card.image}
                alt={card.name}
                className="rounded-none border-0"
                sizes="(max-width: 768px) 45vw, 25vw"
              />
              <span className="absolute top-2 left-2">
                <Badge variant={rarityVariant(card.rarity)}>
                  {card.rarity}
                </Badge>
              </span>
              {card.grade !== "Ungraded" && (
                <span className="absolute top-2 right-2">
                  <Badge variant="outline">{card.grade}</Badge>
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
                <p className="text-sm font-semibold text-white">{card.name}</p>
                <p className="text-xs text-white/70">{card.set}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function CollectionPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [setFilter, setSetFilter] = useState("All Sets");
  const [rarityFilter, setRarityFilter] = useState("All Rarities");
  const [gradeFilter, setGradeFilter] = useState("Any Grade");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [sortKey, setSortKey] = useState<SortKey>("value_desc");
  const addToCart = useCartStore((s) => s.addItem);
  const wishlistIds = useWishlistStore((s) => s.ids);
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const { data: allCards, isLoading, isError } = useCards();
  const ownedCards = useMemo(
    () => (allCards ?? []).filter((c) => c.owned),
    [allCards],
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
  }, [
    ownedCards,
    setFilter,
    rarityFilter,
    gradeFilter,
    typeFilter,
    query,
    sortKey,
  ]);

  const handleView = useCallback(
    (id: string) => {
      router.push(`/collection/${id}`);
    },
    [router],
  );

  const handleAddToCart = useCallback(
    (id: string) => {
      const card = getCardById(id);
      if (!card) return;
      addToCart({
        productId: card.id,
        name: card.name,
        image: card.image,
        price: card.marketPrice,
      });
      toast.success(`Added ${card.name} to cart`);
    },
    [addToCart],
  );

  const handleWishlist = useCallback(
    (id: string) => {
      toggleWishlist(id);
      const card = getCardById(id);
      if (card) {
        toast.success(
          wishlistIds.includes(id)
            ? `Removed ${card.name} from wishlist`
            : `Added ${card.name} to wishlist`,
        );
      }
    },
    [toggleWishlist, wishlistIds],
  );

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
        className="flex items-center gap-6 border-b border-border"
        role="tablist"
        aria-label="Collection sections"
      >
        <span className="border-b-2 border-primary pb-2 text-xs font-medium text-foreground">
          Cards
        </span>
        <Link
          href="/collection/activity"
          className="border-b-2 border-transparent pb-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Activity
        </Link>
        <Link
          href="/collection/shipping"
          className="border-b-2 border-transparent pb-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Shipping
        </Link>
      </div>

      {/* Unopened packs */}
      <UnopenedPacksSection />

      {/* Highlights */}
      <CollectionHighlights onView={handleView} />

      {/* Rewards progress */}
      <RewardProgress
        xp={1680}
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
                    {setFilters.map((s) => (
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
                    {rarityFilters.map((r) => (
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
                    {gradeFilters.map((g) => (
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
                    {typeFilters.map((t) => (
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
              onWishlist={handleWishlist}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
