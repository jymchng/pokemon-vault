import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex shrink-0 items-center gap-2.5 outline-none",
        className,
      )}
      aria-label="Pokémon Vault home"
    >
      <span className="relative flex size-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 transition-colors group-hover:border-primary/60">
        {/* Poké Ball / vault mark */}
        <svg
          viewBox="0 0 24 24"
          className="size-4.5 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Pokémon Vault
          </span>
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
            Collect · Shop · Discover
          </span>
        </span>
      )}
    </Link>
  );
}
