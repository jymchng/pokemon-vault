import { Eye, Heart, ShoppingBag, Repeat } from "lucide-react";
import { CardArt } from "./card-art";
import { Badge } from "@/components/ui/badge";
import {
  rarityVariant,
  gradeVariant,
  formatCurrency,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { PokemonCard } from "@/lib/types";

export function PokemonCardTile({
  card,
  onView,
  onWishlist,
  onAddToCart,
  onSell,
  className,
  showActions = true,
}: {
  card: PokemonCard;
  onView?: (id: string) => void;
  onWishlist?: (id: string) => void;
  onAddToCart?: (id: string) => void;
  onSell?: (id: string) => void;
  className?: string;
  showActions?: boolean;
}) {
  const rarityV = rarityVariant(card.rarity);
  const gradeV = gradeVariant(card.grade);

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-elevated",
        className,
      )}
    >
      {/* Art */}
      <button
        onClick={() => onView?.(card.id)}
        className="relative block w-full cursor-pointer overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-label={`View ${card.name}`}
      >
        <CardArt
          src={card.image}
          alt={card.name}
          sizes="(max-width: 768px) 45vw, 20vw"
        />
        {/* Grade overlay */}
        {card.grade !== "Ungraded" && (
          <span className="absolute top-2 left-2">
            <Badge variant={gradeV}>{card.grade}</Badge>
          </span>
        )}
        {/* Owned badge */}
        {card.owned && (
          <span className="absolute top-2 right-2">
            <Badge variant="success">Owned</Badge>
          </span>
        )}
      </button>

      {/* Metadata */}
      <div className="flex flex-col gap-1 px-1 pb-1">
        <div className="flex items-start justify-between gap-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {card.name}
          </p>
        </div>
        <p className="truncate text-xs text-muted-foreground">{card.set}</p>
        <div className="flex items-center gap-1.5">
          <Badge variant={rarityV}>{card.rarity}</Badge>
          {card.quantity > 1 && (
            <span className="text-xs font-medium text-muted-foreground">
              ×{card.quantity}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground">
          {formatCurrency(card.marketPrice)}
        </p>
      </div>

      {/* Quick actions (revealed on hover) */}
      {showActions && (
        <div className="flex items-center justify-between gap-1 border-t border-border px-1 pt-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
          <button
            onClick={() => onView?.(card.id)}
            className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            aria-label={`View ${card.name}`}
          >
            <Eye className="size-3.5" /> View
          </button>
          <button
            onClick={() => onWishlist?.(card.id)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-primary"
            aria-label={`Wishlist ${card.name}`}
          >
            <Heart className="size-3.5" />
          </button>
          <button
            onClick={() => onSell?.(card.id)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-accent-blue"
            aria-label={`Sell or trade ${card.name}`}
          >
            <Repeat className="size-3.5" />
          </button>
          <button
            onClick={() => onAddToCart?.(card.id)}
            className="flex h-7 items-center justify-center gap-1 rounded-md bg-secondary px-2 text-[11px] font-semibold text-primary transition-colors hover:bg-secondary/70"
            aria-label={`Add ${card.name} to cart`}
          >
            <ShoppingBag className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
