"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Package } from "lucide-react";
import { useCollectionStore } from "@/lib/store/collection-store";
import { useActivityStore } from "@/lib/store/activity-store";
import { useRewardsStore } from "@/lib/store/rewards-store";
import { toast } from "sonner";
import type { BoosterPack } from "@/lib/types";

interface PackPull {
  id: string;
  name: string;
  rarity: string;
  image: string;
}

function pickRarity(odds: BoosterPack["odds"]): string {
  const roll = Math.random() * 100;
  if (roll < odds.secretRare) return "Secret Rare";
  if (roll < odds.secretRare + odds.ultraRare) return "Ultra Rare";
  if (roll < odds.secretRare + odds.ultraRare + odds.rare) return "Rare";
  if (roll < odds.secretRare + odds.ultraRare + odds.rare + odds.uncommon)
    return "Uncommon";
  return "Common";
}

const PULL_NAMES: Record<string, string[]> = {
  "Pokémon 151": [
    "Mew ex",
    "Charizard ex",
    "Pikachu",
    "Squirtle",
    "Bulbasaur",
    "Caterpie",
    "Eevee",
    "Snorlax",
    "Venusaur ex",
    "Blastoise ex",
  ],
  "Obsidian Flames": [
    "Charizard ex",
    "Pidgeot ex",
    "Tyranitar ex",
    "Cleffa",
    "Geeta",
    "Riolu",
    "Eiscue",
    "Toedscruel",
    "Gloom",
    "Ninetales",
  ],
  "Scarlet & Violet": [
    "Koraidon ex",
    "Miraidon ex",
    "Pikachu",
    "Pawmi",
    "Fidough",
    "Tinkaton",
    "Arcanine",
    "Gardevoir",
    "Kirlia",
    "Ralts",
  ],
  "Paldean Fates": [
    "Charizard ex",
    "Pikachu",
    "Shiny Dondozo",
    "Shiny Tatsugiri",
    "Miraidon ex",
    "Iono",
    "Nemona",
    "Penny",
    "Shiny Toedscruel",
    "Shiny Glimmet",
  ],
  "Temporal Forces": [
    "Walking Wake ex",
    "Iron Leaves ex",
    "Gouging Fire ex",
    "Raging Bolt ex",
    "Iron Crown ex",
    "Iron Boulder ex",
    "Litten",
    "Chimchar",
    "Piplup",
    "Turtwig",
  ],
  "Twilight Masquerade": [
    "Ogerpon ex",
    "Greninja ex",
    "Umbreon ex",
    "Dragapult ex",
    "Tatsugiri",
    "Gengar",
    "Munkidori",
    "Fezandipiti",
    "Okidogi",
    "Sinistcha ex",
  ],
  "Surging Sparks": [
    "Pikachu ex",
    "Lapras ex",
    "Alolan Exeggutor ex",
    "Milotic ex",
    "Flygon ex",
    "Latias ex",
    "Latios ex",
    "Hydreigon ex",
    "Klawf",
    "Duraludon",
  ],
  "Premium Vault Pack": [
    "Charizard ex",
    "Umbreon ex",
    "Greninja ex",
    "Mew ex",
    "Rayquaza ex",
    "Gengar ex",
    "Lugia ex",
    "Pikachu ex",
    "Eevee ex",
    "Dragonite ex",
  ],
};

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
  const [pulls, setPulls] = useState<PackPull[]>([]);
  const [revealedIndex, setRevealedIndex] = useState(0);
  const addCards = useCollectionStore((s) => s.addCards);
  const addEvent = useActivityStore((s) => s.addEvent);
  const addXp = useRewardsStore((s) => s.addXp);

  const generatePulls = (): PackPull[] => {
    const names = PULL_NAMES[pack.name] ?? PULL_NAMES["Pokémon 151"];
    return Array.from({ length: 5 }).map((_, i) => {
      const rarity = pickRarity(pack.odds);
      const name =
        rarity === "Secret Rare" || rarity === "Ultra Rare"
          ? names[i % Math.min(4, names.length)]
          : names[(i + 3) % names.length];
      return {
        id: `${pack.slug}-${i}-${Date.now()}`,
        name,
        rarity,
        image: "/images/placeholder-card.png",
      };
    });
  };

  const openPack = () => {
    setPulls(generatePulls());
    setRevealedIndex(0);
    setPhase("opening");
    setTimeout(() => setPhase("revealing"), 1400);
  };

  const revealNext = () => {
    const next = revealedIndex + 1;
    if (next >= pulls.length) {
      setPhase("done");
      // Commit to collection + activity + rewards
      addCards(
        pulls.map((p) => ({
          id: p.id,
          name: p.name,
          rarity: p.rarity,
          set: pack.name,
          image: p.image,
        })),
      );
      addEvent({
        id: `evt-${Date.now()}`,
        type: "opened_pack",
        title: `Opened ${pack.name} Booster Pack`,
        subtitle: pulls.map((p) => p.name).join(", "),
        image: "/images/placeholder-card.png",
        date: new Date().toISOString(),
        xp: 10,
      });
      addXp(10);
      toast.success("Pack opened! 5 cards added to your collection", {
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
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
              <p className="text-center text-sm font-semibold text-white">
                {pack.name}
              </p>
            </div>
          </div>
          <button
            onClick={openPack}
            className="group inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#e8b93a] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Package className="size-4 transition-transform group-hover:-rotate-12" />
            Open Pack
          </button>
          <p className="text-xs text-muted-foreground">
            Playful simulated collection feature — 5 cards per pack
          </p>
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
          <div className="flex items-center gap-2">
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
