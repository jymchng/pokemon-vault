import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-2xl">
          🛡️
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Pokémon Vault</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Premium Pokémon trading-card store and collection manager. The
          foundation is ready — pages are being built.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button>Shop Cards</Button>
        <Button variant="outline">Explore Packs</Button>
      </div>
      <p className="text-xs text-muted">
        Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · TanStack
        Query
      </p>
    </main>
  );
}
