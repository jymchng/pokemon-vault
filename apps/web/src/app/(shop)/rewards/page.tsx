"use client";

import Link from "next/link";
import { Trophy, ChevronRight, Crown, Package, LogIn } from "lucide-react";
import { useRewardTiers } from "@/lib/hooks/queries";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { RewardProgress } from "@/components/rewards/reward-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useRewardsStore } from "@/lib/store/rewards-store";
import { useAuthStore } from "@/lib/store/auth-store";

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

export default function RewardsPage() {
  const signedIn = useAuthStore((s) => s.signedIn);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);
  const xp = useRewardsStore((s) => s.xp);
  const level = useRewardsStore((s) => s.level);

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Collector Rewards"
          subtitle="Earn XP, unlock rewards, and grow your collection."
        />
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
            <LogIn className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Sign in to view your rewards
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Sign in to see your level and rewards progress.
          </p>
          <Button size="lg" onClick={() => setSignInOpen(true)}>
            Sign In / Create Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Collector Rewards"
        subtitle="Earn XP, unlock rewards, and grow your collection."
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

      {/* Explore packs CTA */}
      <section className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3">
          <Package className="size-5 text-primary" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              Ready to climb?
            </span>
            <span className="text-xs text-muted-foreground">
              Open packs to earn XP and unlock rewards.
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
