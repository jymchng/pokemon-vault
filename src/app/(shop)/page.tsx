import { Button } from "@/components/ui/button";
import { Sparkles, Package } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-surface px-6 py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-secondary">
          <Sparkles className="size-6 text-primary" />
        </div>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Build Your Pokémon Collection
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Discover cards, open packs, and find your next favorite Pokémon.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Button size="lg" render={<a href="/store" />} nativeButton={false}>
            Shop Cards
          </Button>
          <Button
            variant="outline"
            size="lg"
            render={<a href="/packs" />}
            nativeButton={false}
          >
            <Package /> Explore Packs
          </Button>
        </div>
      </section>

      {/* Placeholder sections — filled in later phases */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex h-40 flex-col justify-between rounded-xl border border-border bg-surface p-4"
          >
            <div className="h-3 w-2/3 rounded-full bg-elevated" />
            <div className="h-3 w-1/3 rounded-full bg-elevated" />
          </div>
        ))}
      </section>
    </div>
  );
}
