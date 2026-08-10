"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  MapPin,
  CreditCard,
  Settings,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRewardsStore } from "@/lib/store/rewards-store";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addresses } from "@/lib/data/shipping";
import { toast } from "sonner";
import { initials } from "@/lib/utils/format";

export default function AccountPage() {
  const signedIn = useAuthStore((s) => s.signedIn);
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);
  const xp = useRewardsStore((s) => s.xp);
  const level = useRewardsStore((s) => s.level);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Account"
          subtitle="Manage your profile, addresses, and settings."
        />
        <EmptyState
          icon={<User className="size-6" />}
          title="Sign in to your account"
          description="Create an account to manage your collection, orders, and rewards."
          primaryAction={
            <Button onClick={() => setSignInOpen(true)}>Sign In</Button>
          }
          secondaryAction={
            <Button
              variant="outline"
              onClick={() =>
                signIn({
                  name: "Demo Trainer",
                  email: "demo@vault.io",
                  level: 7,
                  xp,
                })
              }
            >
              Use Demo Account
            </Button>
          }
        />
      </div>
    );
  }

  const displayName = user?.name ?? (name || "Trainer");

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
            onClick={() => {
              signOut();
              toast.success("Signed out");
            }}
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
          <span className="text-xs text-muted-foreground">
            {user?.email ?? email}
          </span>
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

      {/* Profile form */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-foreground">
          Profile Settings
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Button
            size="sm"
            onClick={() => {
              signIn({
                name: name || "Trainer",
                email: email || "trainer@vault.io",
                level,
                xp,
              });
              toast.success("Profile updated");
            }}
          >
            Save Changes
          </Button>
        </div>
      </section>

      {/* Addresses */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">
          Saved Addresses
        </h2>
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
                <span className="font-medium text-foreground">{addr.name}</span>
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
      </section>
    </div>
  );
}
