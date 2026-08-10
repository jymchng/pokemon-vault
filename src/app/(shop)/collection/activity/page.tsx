"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { getActivityEvents, type PlatformPull } from "@/lib/data/activity";
import { useActivity, usePlatformPulls } from "@/lib/hooks/queries";
import { ActivityItem } from "@/components/collection/activity-item";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

function groupByDay(events: ReturnType<typeof getActivityEvents>) {
  const groups: { label: string; items: typeof events }[] = [];
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const labelFor = (dateStr: string) => {
    const d = new Date(dateStr);
    const same = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    if (same(d, today)) return "Today";
    if (same(d, yesterday)) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  for (const ev of events) {
    const label = labelFor(ev.date);
    const existing = groups.find((g) => g.label === label);
    if (existing) existing.items.push(ev);
    else groups.push({ label, items: [ev] });
  }
  return groups;
}

function PullRow({ pull }: { pull: PlatformPull }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-border-strong">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pull.image}
        alt=""
        className="size-12 shrink-0 rounded-lg border border-border object-cover"
        loading="lazy"
        decoding="async"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-foreground">
          {pull.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          <span className="text-muted">{pull.condition}</span>
          {" · "}
          <span>{pull.packPrice}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {pull.value.toLocaleString()}
        </span>
        <span className="text-[11px] text-muted-foreground">{pull.time}</span>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const [tab, setTab] = useState<"you" | "platform">("you");
  const { data: activityData } = useActivity();
  const { data: platformData } = usePlatformPulls();
  const events = useMemo(
    () => activityData ?? getActivityEvents(),
    [activityData],
  );
  const groups = useMemo(() => groupByDay(events), [events]);
  const platformPulls = platformData ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title="Collection"
        subtitle="Live pulls and pack openings across your collection."
      />

      {/* Tabs (Cards/Activity/Shipping) */}
      <div
        className="flex items-center gap-6 border-b border-border"
        role="tablist"
        aria-label="Collection sections"
      >
        <Link
          href="/collection"
          className="border-b-2 border-transparent pb-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Cards
        </Link>
        <span className="border-b-2 border-primary pb-2 text-sm font-semibold text-foreground">
          Activity
        </span>
        <Link
          href="/collection/shipping"
          className="border-b-2 border-transparent pb-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Shipping
        </Link>
      </div>

      {/* Recent pulls */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold text-foreground">
              Recent pulls
            </h2>
            <p className="text-xs text-muted-foreground">
              Live pulls and pack openings from you and the platform.
            </p>
          </div>
          {/* You / Platform sub-tabs */}
          <div
            className="flex items-center gap-1 rounded-full border border-border bg-elevated p-0.5"
            role="tablist"
            aria-label="Pulls source"
          >
            <button
              onClick={() => setTab("you")}
              role="tab"
              aria-selected={tab === "you"}
              className={cn(
                "h-7 rounded-full px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                tab === "you"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              You
            </button>
            <button
              onClick={() => setTab("platform")}
              role="tab"
              aria-selected={tab === "platform"}
              className={cn(
                "h-7 rounded-full px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                tab === "platform"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Platform
            </button>
          </div>
        </div>

        {tab === "you" ? (
          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold tracking-widest text-muted uppercase">
                  {group.label}
                </p>
                {group.items.map((ev) => (
                  <ActivityItem key={ev.id} event={ev} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {platformPulls.map((pull) => (
              <PullRow key={pull.id} pull={pull} />
            ))}
          </div>
        )}

        {/* Loading more hint (infinite feed feel) */}
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
          <Package className="size-3.5 animate-pulse" />
          <span>Loading more pulls...</span>
        </div>
      </section>

      {/* Sample value legend */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <Badge variant="outline">Value in USD</Badge>
        <span>
          {tab === "you" ? "Your pull values" : "Platform-wide pull values"}
        </span>
      </div>
    </div>
  );
}
