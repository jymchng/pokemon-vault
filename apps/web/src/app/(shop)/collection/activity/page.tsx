"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Package, LogIn } from "lucide-react";
import { useCollectionActivity } from "@/lib/hooks/queries";
import { ActivityItem } from "@/components/collection/activity-item";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/auth-store";
import type { ActivityEvent } from "@/lib/types";

function groupByDay(events: ActivityEvent[]) {
  const groups: { label: string; items: ActivityEvent[] }[] = [];
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

export default function ActivityPage() {
  const signedIn = useAuthStore((s) => s.signedIn);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);
  const { data: activityData = [], isLoading } = useCollectionActivity();
  const events = useMemo(() => activityData, [activityData]);
  const groups = useMemo(() => groupByDay(events), [events]);

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
          className="border-b-2 border-transparent pb-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Cards
        </Link>
        <span className="border-b-2 border-primary pb-2 text-xs font-medium text-foreground">
          Activity
        </span>
        <Link
          href="/collection/shipping"
          className="border-b-2 border-transparent pb-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Shipping
        </Link>
      </div>

      {!signedIn ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
            <LogIn className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Sign in to see your activity
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your collection activity (pack openings, purchases, rewards) is
            stored server-side.
          </p>
          <Button size="lg" onClick={() => setSignInOpen(true)}>
            Sign In / Create Account
          </Button>
        </div>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold text-foreground">
                Recent activity
              </h2>
              <p className="text-xs text-muted-foreground">
                Pack openings, purchases, and rewards from your account.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong py-14 text-center">
              <Package className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No activity yet. Open a pack or complete an order to get
                started.
              </p>
              <Button
                variant="outline"
                render={<Link href="/packs" />}
                nativeButton={false}
              >
                Open a Pack
              </Button>
            </div>
          ) : (
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
          )}

          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Badge variant="outline">Value in USD</Badge>
          </div>
        </section>
      )}
    </div>
  );
}
