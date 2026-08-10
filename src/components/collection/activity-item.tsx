import { Package, ShoppingBag, Truck, TrendingUp, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/lib/types";

const typeConfig = {
  added: { icon: Plus, color: "text-accent-blue", badge: "Added" },
  purchased: { icon: ShoppingBag, color: "text-primary", badge: "Purchased" },
  opened_pack: { icon: Package, color: "text-accent-purple", badge: "Pack" },
  sold: { icon: TrendingUp, color: "text-success", badge: "Sold" },
  shipped: { icon: Truck, color: "text-muted-foreground", badge: "Shipped" },
} as const;

export function ActivityItem({
  event,
  className,
}: {
  event: ActivityEvent;
  className?: string;
}) {
  const cfg = typeConfig[event.type];
  const Icon = cfg.icon;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-surface p-3",
        className,
      )}
    >
      {event.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.image}
          alt=""
          className="size-12 shrink-0 rounded-lg border border-border object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Icon className={cn("size-5", cfg.color)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{cfg.badge}</Badge>
          <span className="truncate text-sm font-medium text-foreground">
            {event.title}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {event.subtitle}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {event.xp !== undefined && (
          <span className="text-xs font-semibold text-primary">
            +{event.xp} XP
          </span>
        )}
        <span className="text-[11px] text-muted-foreground">
          {timeAgo(event.date)}
        </span>
      </div>
    </div>
  );
}
