"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  SkeletonCard,
  SkeletonGrid,
  SkeletonRows,
} from "@/components/ui/skeleton-card";
import { FilterPills } from "@/components/ui/filter-pills";
import { Pagination } from "@/components/ui/pagination";
import { PriceTag, ValueDelta } from "@/components/ui/price-tag";
import { RewardProgress } from "@/components/rewards/reward-progress";
import { PokemonCardTile } from "@/components/cards/pokemon-card";
import { ProductCard } from "@/components/products/product-card";
import { ActivityItem } from "@/components/collection/activity-item";
import { Package } from "lucide-react";

// Demo data
const demoCard = {
  id: "card-001",
  name: "Charizard ex",
  set: "Obsidian Flames",
  cardNumber: "223/197",
  rarity: "Special Illustration Rare",
  type: "Fire",
  grade: "PSA 10",
  condition: "Gem Mint",
  image: "/images/placeholder-card.png",
  owned: true,
  quantity: 1,
  acquiredAt: "2026-08-04",
  marketPrice: 189.99,
} as const;

const demoProduct = {
  id: "product-001",
  name: "Charizard ex — PSA 10",
  category: "Graded Card",
  set: "Obsidian Flames",
  price: 189.99,
  image: "/images/placeholder-card.png",
  stock: 3,
  rating: 4.9,
  availability: "In Stock",
  featured: true,
} as const;

const demoActivity = {
  id: "act-1",
  type: "added",
  title: "Added Charizard ex",
  subtitle: "Obsidian Flames · PSA 10",
  date: new Date().toISOString(),
  xp: 25,
} as const;

export default function ComponentsPage() {
  return (
    <div className="flex flex-col gap-10 pb-16">
      <PageHeader
        title="Component System"
        subtitle="Reusable UI built on customized shadcn/ui primitives"
      />

      {/* Buttons */}
      <section>
        <SectionHeader title="Buttons" />
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-5">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Badges */}
      <section>
        <SectionHeader title="Badges (rarity + grade)" />
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-5">
          <Badge variant="common">Common</Badge>
          <Badge variant="uncommon">Uncommon</Badge>
          <Badge variant="rare">Rare</Badge>
          <Badge variant="ultra">Illustration Rare</Badge>
          <Badge variant="secret">Secret Rare</Badge>
          <Badge variant="psa">PSA 10</Badge>
          <Badge variant="cgc">CGC 10</Badge>
          <Badge variant="bgs">BGS 10</Badge>
          <Badge variant="success">In Stock</Badge>
          <Badge variant="warning">Low Stock</Badge>
          <Badge variant="destructive">Sold Out</Badge>
          <Badge variant="premium">Featured</Badge>
        </div>
      </section>

      {/* Forms */}
      <section>
        <SectionHeader title="Form controls" />
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
          <Input placeholder="Search by Pokémon, set, or card number" />
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox /> Available
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox /> Listed
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch /> Turbo auto-sell
            </label>
          </div>
          <div className="max-w-xs">
            <Slider defaultValue={[50]} max={100} aria-label="FMV value" />
          </div>
        </div>
      </section>

      {/* Progress */}
      <section>
        <SectionHeader title="Progress" />
        <div className="rounded-2xl border border-border bg-surface p-5">
          <Progress value={62} className="[&_[data-slot=progress-track]]:h-2.5">
            <span className="sr-only">62% complete</span>
          </Progress>
        </div>
      </section>

      {/* RewardProgress */}
      <section>
        <SectionHeader title="Reward progress card" />
        <RewardProgress
          xp={1680}
          currentLevelXp={0}
          nextLevelXp={2000}
          nextRewardLabel="1 Free Booster Pack"
        />
      </section>

      {/* Prices */}
      <section>
        <SectionHeader title="Prices" />
        <div className="flex items-center gap-6 rounded-2xl border border-border bg-surface p-5">
          <PriceTag price={189.99} />
          <PriceTag price={25000} size="lg" />
          <ValueDelta delta={4662} />
          <ValueDelta delta={-12.5} />
        </div>
      </section>

      {/* Filter pills */}
      <section>
        <SectionHeader title="Filter pills" />
        <FilterPills
          pills={[
            { key: "set", label: "Pokémon 151 ×" },
            { key: "grade", label: "PSA 10 ×" },
            { key: "rarity", label: "Illustration Rare ×" },
          ]}
          onRemove={() => {}}
          onClearAll={() => {}}
        />
      </section>

      {/* Empty state */}
      <section>
        <SectionHeader title="Empty state" />
        <EmptyState
          icon={<Package className="size-6" />}
          title="Start your collection"
          description="Open a booster pack or shop your first Pokémon card."
        />
      </section>

      {/* Cards */}
      <section>
        <SectionHeader title="Card tile + product card" />
        <div className="grid max-w-4xl grid-cols-2 gap-5 sm:grid-cols-3">
          <PokemonCardTile card={demoCard} />
          <PokemonCardTile
            card={{ ...demoCard, grade: "Ungraded", owned: false }}
          />
          <ProductCard product={demoProduct} />
        </div>
      </section>

      {/* Activity */}
      <section>
        <SectionHeader title="Activity item" />
        <ActivityItem event={demoActivity} />
      </section>

      {/* Skeletons */}
      <section>
        <SectionHeader title="Loading states" />
        <SkeletonGrid count={5} />
        <div className="mt-4">
          <SkeletonRows count={2} />
        </div>
        <div className="mt-4">
          <SkeletonCard className="w-40" />
        </div>
      </section>

      {/* Pagination */}
      <section>
        <SectionHeader title="Pagination" />
        <Pagination page={2} totalPages={5} onPageChange={() => {}} />
      </section>

      <Separator />
      <p className="text-xs text-muted-foreground">
        All components consume the Pokémon Vault design tokens. Replace
        placeholder images with generated card art in the content phase.
      </p>
    </div>
  );
}
