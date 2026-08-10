import { Heart, ShoppingBag, Star } from "lucide-react";
import { CardArt } from "@/components/cards/card-art";
import { Badge } from "@/components/ui/badge";
import { PriceTag } from "@/components/ui/price-tag";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

const availabilityVariant = {
  "In Stock": "success",
  "Low Stock": "warning",
  "Sold Out": "destructive",
} as const;

export function ProductCard({
  product,
  onView,
  onAddToCart,
  onWishlist,
  wishlisted = false,
  className,
}: {
  product: Product;
  onView?: (id: string) => void;
  onAddToCart?: (id: string) => void;
  onWishlist?: (id: string) => void;
  wishlisted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-elevated",
        className,
      )}
    >
      <button
        onClick={() => onView?.(product.id)}
        className="relative block w-full cursor-pointer overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-label={`View ${product.name}`}
      >
        <CardArt
          src={product.image}
          alt={product.name}
          sizes="(max-width: 768px) 45vw, 20vw"
        />
        <span className="absolute top-2 left-2">
          <Badge variant={availabilityVariant[product.availability]}>
            {product.availability}
          </Badge>
        </span>
        {product.featured && (
          <span className="absolute top-2 right-2">
            <Badge variant="premium">Featured</Badge>
          </span>
        )}
      </button>

      <div className="flex flex-col gap-1 px-1 pb-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {product.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">{product.set}</p>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline">{product.category}</Badge>
          <span className="ml-auto flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
            <Star className="size-3 fill-accent-yellow text-accent-yellow" />
            {product.rating.toFixed(1)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <PriceTag price={product.price} />
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-t border-border px-1 pt-2">
        <button
          onClick={() => onAddToCart?.(product.id)}
          disabled={product.availability === "Sold Out"}
          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-colors hover:bg-[#e8b93a] disabled:opacity-40"
          aria-label={`Add ${product.name} to cart`}
        >
          <ShoppingBag className="size-3.5" />
          {product.availability === "Sold Out" ? "Sold Out" : "Add to Cart"}
        </button>
        <button
          onClick={() => onWishlist?.(product.id)}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border border-border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            wishlisted
              ? "border-primary/40 bg-secondary text-primary"
              : "text-muted-foreground hover:border-border-strong hover:text-primary",
          )}
          aria-label={
            wishlisted
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
        >
          <Heart className={cn("size-3.5", wishlisted && "fill-current")} />
        </button>
      </div>
    </div>
  );
}
