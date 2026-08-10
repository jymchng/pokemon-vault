"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-xl">
        ⚠️
      </div>
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred while loading Pokémon Vault.
        {error.digest ? ` (${error.digest})` : ""}
      </p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
