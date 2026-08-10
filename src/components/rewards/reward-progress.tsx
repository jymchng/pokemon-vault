import { Gift, Trophy, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RewardProgress({
  xp,
  currentLevelXp,
  nextLevelXp,
  nextRewardLabel,
  className,
}: {
  xp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  nextRewardLabel: string;
  className?: string;
}) {
  const total = nextLevelXp - currentLevelXp;
  const intoLevel = xp - currentLevelXp;
  const percent =
    total > 0 ? Math.min(100, Math.round((intoLevel / total) * 100)) : 100;
  const remaining = Math.max(0, total - intoLevel);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-secondary">
          <Trophy className="size-4.5 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            Next Collector Reward
          </span>
          <span className="text-xs text-muted-foreground">
            {remaining > 0
              ? `You're ${remaining.toLocaleString()} XP away from your next reward.`
              : "Reward unlocked — claim it now!"}
          </span>
        </div>
      </div>

      <Progress value={percent} className="[&_[data-slot=progress-track]]:h-2">
        <span className="sr-only">{percent}% complete</span>
      </Progress>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Gift className="size-3" />
            Next reward: {nextRewardLabel}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          render={<a href="/rewards" />}
          nativeButton={false}
        >
          View Rewards <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
