import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export function PriceTag({
  price,
  className,
  size = "md",
}: {
  price: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "font-semibold tabular-nums text-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        size === "lg" && "text-lg",
        className,
      )}
    >
      {formatCurrency(price)}
    </span>
  );
}

export function ValueDelta({
  delta,
  className,
}: {
  delta: number;
  className?: string;
}) {
  const positive = delta >= 0;
  return (
    <span
      className={cn(
        "text-xs font-semibold tabular-nums",
        positive ? "text-success" : "text-destructive",
        className,
      )}
    >
      {positive ? "+" : ""}
      {delta.toFixed(1)}%
    </span>
  );
}
