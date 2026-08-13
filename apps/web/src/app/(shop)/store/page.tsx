"use client";

import { useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Filter,
  Heart,
  ShoppingBag,
} from "lucide-react";
import {
  categories,
  sortOptions,
  type ProductSortKey,
} from "@/lib/data/products";
import { useProducts } from "@/lib/hooks/queries";
import { ProductCard } from "@/components/products/product-card";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { FilterPills } from "@/components/ui/filter-pills";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonGrid } from "@/components/ui/skeleton-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardArt } from "@/components/cards/card-art";
import { PriceTag } from "@/components/ui/price-tag";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Product } from "@/lib/types";

function ProductDetailModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const addToCart = useCartStore((s) => s.addItem);
  const wishlistIds = useWishlistStore((s) => s.ids);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const wishlisted = wishlistIds.includes(product.id);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>{product.set}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          <CardArt
            src={product.image}
            alt={product.name}
            className="rounded-2xl"
            sizes="400px"
          />
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{product.category}</Badge>
              <Badge
                variant={
                  product.availability === "In Stock"
                    ? "success"
                    : product.availability === "Low Stock"
                      ? "warning"
                      : "destructive"
                }
              >
                {product.availability}
              </Badge>
            </div>
            {product.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}
            <div className="flex items-center justify-between rounded-xl border border-border bg-elevated p-3">
              <span className="text-xs text-muted-foreground">Price</span>
              <PriceTag price={product.price} size="lg" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-elevated p-3">
              <span className="text-xs text-muted-foreground">Rating</span>
              <span className="text-sm font-semibold text-foreground">
                ★ {product.rating.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-elevated p-3">
              <span className="text-xs text-muted-foreground">Stock</span>
              <span className="text-sm font-semibold text-foreground">
                {product.stock} available
              </span>
            </div>
            <div className="mt-auto flex flex-col gap-2">
              <Button
                size="lg"
                disabled={product.availability === "Sold Out"}
                onClick={() => {
                  addToCart({
                    productId: product.id,
                    name: product.name,
                    image: product.image,
                    price: product.price,
                  });
                  toast.success(`Added ${product.name} to cart`);
                }}
              >
                <ShoppingBag className="size-4" />
                {product.availability === "Sold Out"
                  ? "Sold Out"
                  : "Add to Cart"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  toggleWishlist(product.id);
                  toast.success(
                    wishlisted
                      ? `Removed ${product.name} from wishlist`
                      : `Added ${product.name} to wishlist`,
                  );
                }}
              >
                <Heart className={cn("size-4", wishlisted && "fill-current")} />
                {wishlisted ? "In Wishlist" : "Add to Wishlist"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function StorePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Products");
  const [sortKey, setSortKey] = useState<ProductSortKey>("featured");
  const addToCart = useCartStore((s) => s.addItem);
  const wishlistIds = useWishlistStore((s) => s.ids);
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const { data: allProducts, isLoading, isError } = useProducts();

  const selected = selectedId
    ? (allProducts ?? []).find((p) => p.id === selectedId) ?? null
    : null;

  const featured = useMemo(
    () => (allProducts ?? []).filter((p) => p.featured).slice(0, 4),
    [allProducts],
  );
  const trending = useMemo(
    () => (allProducts ?? []).filter((p) => p.trending).slice(0, 4),
    [allProducts],
  );

  const filtered = useMemo(() => {
    let list = (allProducts ?? []).filter((p) => {
      if (category !== "All Products" && p.category !== category) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.set.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "rating":
          return b.rating - a.rating;
        default:
          return Number(b.featured ?? false) - Number(a.featured ?? false);
      }
    });
    return list;
  }, [query, category, sortKey, allProducts]);

  const handleAddToCart = (id: string) => {
    // Look up from the LIVE backend product list (not the static mock) so
    // backend UUIDs resolve — the grid renders real API products (§116).
    const p = (allProducts ?? []).find((prod) => prod.id === id);
    if (!p || p.availability === "Sold Out") return;
    addToCart({
      productId: p.id,
      name: p.name,
      image: p.image,
      price: p.price,
    });
    toast.success(`Added ${p.name} to cart`);
  };

  const handleWishlist = (id: string) => {
    toggleWishlist(id);
    const p = (allProducts ?? []).find((prod) => prod.id === id);
    if (p) {
      toast.success(
        wishlistIds.includes(id)
          ? `Removed ${p.name} from wishlist`
          : `Added ${p.name} to wishlist`,
      );
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Pokémon Store"
        subtitle="Discover cards, booster packs, sealed products, and collector essentials."
      />

      {/* Featured */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="Featured" />
        {isLoading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onView={setSelectedId}
                onAddToCart={handleAddToCart}
                onWishlist={handleWishlist}
                wishlisted={wishlistIds.includes(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Trending */}
      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Trending Cards"
          subtitle="What collectors are chasing right now"
        />
        {isLoading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {trending.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onView={setSelectedId}
                onAddToCart={handleAddToCart}
                onWishlist={handleWishlist}
                wishlisted={wishlistIds.includes(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Category rail */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="Shop All" />
        <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                category === c
                  ? "border-primary/50 bg-secondary text-primary"
                  : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
              )}
              aria-pressed={category === c}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Search + sort */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, sets, categories..."
            className="h-10 rounded-xl bg-surface pl-9"
            aria-label="Search store"
          />
        </div>
        <div className="flex items-center gap-2">
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
              <span className="sr-only">Sort products</span>
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
          <span className="text-xs text-muted-foreground">
            {filtered.length} products
          </span>
        </div>

        <FilterPills
          pills={
            [
              category !== "All Products" && {
                key: "category",
                label: category,
              },
              query && { key: "query", label: `"${query}"` },
            ].filter(Boolean) as { key: string; label: string }[]
          }
          onRemove={(key) => {
            if (key === "category") setCategory("All Products");
            if (key === "query") setQuery("");
          }}
          onClearAll={() => {
            setCategory("All Products");
            setQuery("");
          }}
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid count={8} />
      ) : isError ? (
        <EmptyState
          icon={<Filter className="size-6" />}
          title="Failed to load products"
          description="Something went wrong fetching products. Please try again."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Filter className="size-6" />}
          title="No products found"
          description="Try a different search or category."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onView={setSelectedId}
              onAddToCart={handleAddToCart}
              onWishlist={handleWishlist}
              wishlisted={wishlistIds.includes(p.id)}
            />
          ))}
        </div>
      )}

      {/* Product detail modal */}
      {selected && (
        <ProductDetailModal
          product={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
