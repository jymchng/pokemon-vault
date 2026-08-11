import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterPill {
  key: string;
  label: string;
}

export function FilterPills({
  pills,
  onRemove,
  onClearAll,
  className,
}: {
  pills: FilterPill[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}) {
  if (pills.length === 0) return null;
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="group"
      aria-label="Active filters"
    >
      {pills.map((pill) => (
        <button
          key={pill.key}
          onClick={() => onRemove(pill.key)}
          className="group inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-elevated px-3 text-xs font-medium text-foreground transition-colors hover:border-accent-lime/40 hover:text-accent-lime outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          aria-label={`Remove filter ${pill.label}`}
        >
          {pill.label}
          <X className="size-3 text-muted-foreground group-hover:text-primary" />
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="h-7 rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        Clear All
      </button>
    </div>
  );
}
