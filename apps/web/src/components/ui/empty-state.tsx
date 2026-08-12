import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-strong bg-transparent px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export function EmptyStateAction({
  children,
  variant = "default",
  onClick,
  href,
}: {
  children: ReactNode;
  variant?: "default" | "outline";
  onClick?: () => void;
  href?: string;
}) {
  if (href) {
    return (
      <Button variant={variant} render={<a href={href} />} nativeButton={false}>
        {children}
      </Button>
    );
  }
  return (
    <Button variant={variant} onClick={onClick}>
      {children}
    </Button>
  );
}
