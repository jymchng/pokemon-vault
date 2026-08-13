"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Package, LogIn } from "lucide-react";
import { openPack, type PackOpeningResult } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth-store";
import { useCollectionStore } from "@/lib/store/collection-store";
import { toast } from "sonner";
import type { BoosterPack } from "@/lib/types";

/**
 * Pack opening — server-side (§34-37). The client NEVER picks the cards;
 * it calls POST /packs/:slug/open and animates the backend's returned pulls.
 * Requires sign-in (packs persist to the user's collection server-side).
 */
export function PackOpenStage({
  pack,
  onDone,
}: {
  pack: BoosterPack;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "opening" | "revealing" | "done">(
    "idle",
  );
  const [opening, setOpening] = useState<PackOpeningResult | null>(null);
  const [revealedIndex, setRevealedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const signedIn = useAuthStore((s) => s.signedIn);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);
  const syncCollection = useCollectionStore((s) => s.sync);

  const pulls = (opening?.cards ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    rarity: c.rarity ?? "Common",
    image: c.imageUrl || "/images/placeholder-card.png",
  }));

  const open = async () => {
    if (!signedIn) {
      setSignInOpen(true);
      return;
    }
    setError(null);
    setPhase("opening");
    try {
      const result = await openPack(pack.slug);
      setOpening(result);
      setRevealedIndex(0);
      setPhase("revealing");
      // Cards were persisted to the user's collection server-side.
      await syncCollection().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open pack");
      setPhase("idle");
    }
  };

  const revealNext = () => {
    const next = revealedIndex + 1;
    if (next >= pulls.length) {
      setPhase("done");
      toast.success("Pack opened! Cards added to your collection", {
        description: `${pulls.filter((p) => p.rarity === "Secret Rare" || p.rarity === "Ultra Rare").length} rare pull(s)`,
      });
      onDone();
    } else {
      setRevealedIndex(next);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-surface p-6">
      {phase === "idle" && (
        <>
          <div className="relative aspect-[2.5/3.5] w-44 overflow-hidden rounded-xl border border-border-strong shadow-elevated">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pack.image}
              alt={`${pack.name} booster pack`}
              className="size-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
              <p className="text-center text-sm font-semibold text-white">
                {pack.name}
              </p>
            </div>
          </div>
          <button
            onClick={open}
            className="group inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#e8b93a] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {signedIn ? (
              <>
                <Package className="size-4 transition-transform group-hover:-rotate-12" />
                Open Pack
              </>
            ) : (
              <>
                <LogIn className="size-4" />
                Sign in to open
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            {signedIn
              ? `${pack.cardsPerPack} cards per pack — your pulls are saved to your collection`
              : "Open packs with your account — your pulls are saved to your collection"}
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </>
      )}

      {phase === "opening" && (
        <div className="flex min-h-64 flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="relative aspect-[2.5/3.5] w-44"
          >
            <div className="absolute -inset-4 rounded-full bg-primary/20 blur-2xl animate-pulse" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pack.image}
              alt=""
              className="relative size-full rounded-xl border border-primary/50 object-cover shadow-glow-accent"
              loading="lazy"
              decoding="async"
            />
          </motion.div>
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="text-sm font-medium text-primary"
          >
            Opening pack...
          </motion.p>
        </div>
      )}

      {(phase === "revealing" || phase === "done") && (
        <div className="flex min-h-64 flex-col items-center justify-center gap-5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {pulls.map((pull, i) => (
              <div key={pull.id} className="relative">
                <AnimatePresence>
                  {i <= revealedIndex && (
                    <motion.div
                      initial={{ opacity: 0, rotateY: 180, y: 20 }}
                      animate={{ opacity: 1, rotateY: 0, y: 0 }}
                      transition={{ duration: 0.45 }}
                      className="relative aspect-[2.5/3.5] w-16 overflow-hidden rounded-lg border border-border-strong sm:w-20"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pull.image}
                        alt={pull.name}
                        className="size-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      {pull.rarity === "Secret Rare" && (
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="absolute inset-0 bg-accent-yellow/30"
                        />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1">
                        <p className="truncate text-center text-[8px] font-semibold text-white">
                          {pull.name}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
          <button
            onClick={revealNext}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#e8b93a] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Sparkles className="size-4" />
            {revealedIndex >= pulls.length - 1 ? "Done" : "Reveal Next"}
          </button>
          {revealedIndex > 0 && (
            <p className="text-xs text-muted-foreground">
              Pulled:{" "}
              {pulls
                .slice(0, revealedIndex + 1)
                .map((p) => p.name)
                .join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
