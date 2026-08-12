"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, ChevronRight, Crown, Package } from "lucide-react";
import {
  useLeaderboard,
  useRewardTiers,
  useWaysToWin,
} from "@/lib/hooks/queries";
import type { LeaderboardEntry } from "@/lib/data/rewards";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { RewardProgress } from "@/components/rewards/reward-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useRewardsStore } from "@/lib/store/rewards-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { initials } from "@/lib/utils/format";

type Period = "This Week" | "This Month" | "All Time";

const periodOptions: Period[] = ["This Week", "This Month", "All Time"];

function LevelCard() {
  const xp = useRewardsStore((s) => s.xp);
  const level = useRewardsStore((s) => s.level);
  const currentLevelXp = (level - 1) * 500;
  const nextLevelXp = level * 500;
  const intoLevel = xp - currentLevelXp;
  const total = nextLevelXp - currentLevelXp;
  const percent = Math.min(100, Math.round((intoLevel / total) * 100));

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-secondary">
            <Trophy className="size-5 text-primary" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Collector Level
            </span>
            <span className="text-xl font-semibold text-foreground">
              Level {level}
            </span>
          </div>
        </div>
        <Badge variant="premium">
          <Crown className="size-3" /> Elite Collector
        </Badge>
      </div>
      <Progress value={percent} className="[&_[data-slot=progress-track]]:h-2">
        <span className="sr-only">{percent}% to next level</span>
      </Progress>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {intoLevel.toLocaleString()} / {total.toLocaleString()} XP to Level{" "}
          {level + 1}
        </span>
        <span className="font-semibold text-primary">{percent}%</span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Earn Collector XP when you shop, complete your collection, and
        participate in store events.
      </p>
    </div>
  );
}

function RewardLadder() {
  const xp = useRewardsStore((s) => s.xp);
  const { data: tiers } = useRewardTiers();

  return (
    <div className="flex flex-col gap-2">
      {(tiers ?? []).map((tier) => {
        const unlocked = xp >= tier.xp;
        const next = !unlocked && xp < tier.xp;
        return (
          <div
            key={tier.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3",
              unlocked
                ? "border-primary/40 bg-secondary/30"
                : "border-border bg-surface",
            )}
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg text-lg",
                unlocked ? "bg-primary/20" : "bg-elevated opacity-60",
              )}
            >
              {tier.icon}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={cn(
                  "text-sm font-medium",
                  unlocked ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {tier.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {tier.xp.toLocaleString()} XP
              </span>
            </div>
            {unlocked ? (
              <Badge variant="success">Unlocked</Badge>
            ) : next ? (
              <Badge variant="outline">
                {Math.max(0, tier.xp - xp).toLocaleString()} XP to go
              </Badge>
            ) : (
              <Badge variant="ghost">Locked</Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  // order: 2nd, 1st, 3rd visually (guard against partial data)
  const order = [entries[1], entries[0], entries[2]].filter(Boolean);
  const heights = { 1: "h-28", 2: "h-20", 3: "h-16" };

  return (
    <div className="flex items-end justify-center gap-3">
      {order.map((entry) => {
        const isFirst = entry.rank === 1;
        return (
          <div
            key={entry.rank}
            className="flex w-24 flex-col items-center gap-2"
          >
            <div
              className="flex size-12 items-center justify-center rounded-full border-2 text-sm font-bold text-background"
              style={{
                backgroundColor: entry.avatarColor,
                borderColor: isFirst ? "var(--primary)" : "transparent",
              }}
            >
              {initials(entry.name)}
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-semibold text-foreground">
                {entry.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {entry.xp.toLocaleString()} XP
              </span>
            </div>
            <div
              className={cn(
                "flex w-full items-start justify-center rounded-t-lg pt-1 text-background",
                heights[entry.rank as keyof typeof heights],
                isFirst ? "bg-primary" : "bg-muted",
              )}
            >
              <span className="text-sm font-bold">#{entry.rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RewardsPage() {
  const [period, setPeriod] = useState<Period>("This Week");
  const signedIn = useAuthStore((s) => s.signedIn);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);
  const xp = useRewardsStore((s) => s.xp);
  const level = useRewardsStore((s) => s.level);
  const { data: leaderboard } = useLeaderboard();
  const { data: ways } = useWaysToWin();
  const entries = leaderboard ?? [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Collector Rewards"
        subtitle="Earn XP, unlock rewards, and climb the collector leaderboard."
      />

      {/* Progress row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LevelCard />
        <RewardProgress
          xp={xp}
          currentLevelXp={(level - 1) * 500}
          nextLevelXp={level * 500}
          nextRewardLabel={
            (useRewardTiers().data ?? []).find((t) => xp < t.xp)?.label ??
            "Maxed out"
          }
        />
      </div>

      {/* Reward ladder */}
      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Reward Ladder"
          subtitle="Unlock rewards as you earn Collector XP"
        />
        <RewardLadder />
      </section>

      {/* Leaderboard */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold text-foreground">
              Collector Leaderboard
            </h2>
            <p className="text-xs text-muted-foreground">
              Top collectors ranked by Collector XP this period.
            </p>
          </div>
          {/* Period selector (reference week selector) */}
          <div
            className="flex items-center gap-1 rounded-full border border-border bg-elevated p-0.5"
            role="tablist"
            aria-label="Leaderboard period"
          >
            {periodOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setPeriod(opt)}
                role="tab"
                aria-selected={period === opt}
                className={cn(
                  "h-7 rounded-full px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  period === opt
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="grid gap-3 rounded-2xl border border-border bg-surface p-5">
            <div className="skeleton h-28 w-full rounded-xl" />
            <div className="skeleton h-14 w-full rounded-xl" />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <Podium entries={entries} />
          </div>
        )}

        {/* Ranked rows */}
        <div className="flex flex-col gap-2">
          {entries.slice(3).map((entry) => (
            <div
              key={entry.rank}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <span className="w-8 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                {entry.rank}
              </span>
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-background"
                style={{ backgroundColor: entry.avatarColor }}
              >
                {initials(entry.name)}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {entry.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {entry.handle} · {entry.packs} packs
                </span>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {entry.xp.toLocaleString()} XP
              </span>
            </div>
          ))}
        </div>

        {/* Your standing (auth-gated, reference 'Your standing') */}
        {signedIn ? (
          <div className="flex items-center justify-between rounded-2xl border border-primary/40 bg-secondary/20 p-4">
            <div className="flex items-center gap-3">
              <Trophy className="size-5 text-primary" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">
                  Your standing
                </span>
                <span className="text-xs text-muted-foreground">
                  Rank #42 · {xp.toLocaleString()} XP
                </span>
              </div>
            </div>
            <Badge variant="secondary">Top 10%</Badge>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border-strong p-4">
            <div className="flex items-center gap-3">
              <Trophy className="size-5 text-muted-foreground" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  Your standing
                </span>
                <span className="text-xs text-muted-foreground">
                  Sign in to see your rank.
                </span>
              </div>
            </div>
            <Button size="sm" onClick={() => setSignInOpen(true)}>
              Sign In
            </Button>
          </div>
        )}
      </section>

      {/* Ways to win (reference 'Ways to Win') */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="Ways to Win" />
        <div className="grid gap-3 sm:grid-cols-3">
          {(ways ?? []).map((way) => (
            <div
              key={way.title}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
            >
              <span className="text-xl">{way.icon}</span>
              <span className="text-sm font-semibold text-foreground">
                {way.title}
              </span>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {way.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Explore packs CTA */}
      <section className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3">
          <Package className="size-5 text-primary" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              Ready to climb?
            </span>
            <span className="text-xs text-muted-foreground">
              Open packs to earn XP and rise through the ranks.
            </span>
          </div>
        </div>
        <Button
          variant="secondary"
          render={<Link href="/packs" />}
          nativeButton={false}
        >
          Explore Packs <ChevronRight className="size-3.5" />
        </Button>
      </section>
    </div>
  );
}
