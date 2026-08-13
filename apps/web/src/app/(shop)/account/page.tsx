"use client";

import Link from "next/link";
import {
  User,
  MapPin,
  CreditCard,
  Settings,
  ChevronRight,
  LogOut,
  LogIn,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRewardsStore } from "@/lib/store/rewards-store";
import { useAddresses } from "@/lib/hooks/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { initials } from "@/lib/utils/format";

export default function AccountPage() {
  const signedIn = useAuthStore((s) => s.signedIn);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);
  const xp = useRewardsStore((s) => s.xp);
  const level = useRewardsStore((s) => s.level);
  const { data: addresses = [] } = useAddresses();

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Account"
          subtitle="Manage your profile, addresses, and settings."
        />
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
            <LogIn className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Sign in to your account
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your profile, addresses, and rewards are stored server-side — sign
            in to manage them.
          </p>
          <Button size="lg" onClick={() => setSignInOpen(true)}>
            Sign In / Create Account
          </Button>
        </div>
      </div>
    );
  }

  const displayName =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Trainer";

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Account"
        subtitle="Manage your profile, addresses, and settings."
        actions={
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="size-3.5" /> Sign Out
          </Button>
        }
      />

      {/* Profile card */}
      <section className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-lg font-bold text-primary">
          {initials(displayName)}
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-base font-semibold text-foreground">
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground">{user?.email}</span>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="premium">Level {level}</Badge>
            <Badge variant="outline">{xp.toLocaleString()} XP</Badge>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="grid gap-3 sm:grid-cols-2">
        {[
          { icon: User, label: "My Collection", href: "/collection" },
          {
            icon: MapPin,
            label: "Shipping & Addresses",
            href: "/collection/shipping",
          },
          { icon: CreditCard, label: "Orders", href: "/orders" },
          { icon: Settings, label: "Rewards", href: "/rewards" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                <Icon className="size-4 text-primary" />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground">
                {item.label}
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          );
        })}
      </section>

      {/* Addresses */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          Saved Addresses
        </h2>
        {addresses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-strong p-6 text-sm text-muted-foreground">
            No saved addresses yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <span className="text-xs font-semibold tracking-wide text-foreground uppercase">
                    {addr.label}
                  </span>
                  {addr.current && <Badge variant="secondary">Current</Badge>}
                </div>
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {addr.name}
                  </span>
                  <span>{addr.line1}</span>
                  {addr.line2 && <span>{addr.line2}</span>}
                  <span>
                    {addr.city}, {addr.state} {addr.postal}
                  </span>
                  <span>{addr.country}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
