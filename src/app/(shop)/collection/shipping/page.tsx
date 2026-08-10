"use client";

import { useState } from "react";
import Link from "next/link";
import { Truck, MapPin, Package, ChevronRight } from "lucide-react";
import { useAddresses, useShipments } from "@/lib/hooks/queries";
import type { Shipment } from "@/lib/data/shipping";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";

const statusVariant = {
  "In Transit": "info",
  "Out for Delivery": "warning",
  Delivered: "success",
  Processing: "outline",
} as const;

function ShipmentCard({ shipment }: { shipment: Shipment }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">
            Order #{shipment.orderNumber}
          </span>
          <span className="text-xs text-muted-foreground">
            {shipment.carrier} · {shipment.trackingNumber}
          </span>
        </div>
        <Badge
          variant={statusVariant[shipment.status as keyof typeof statusVariant]}
        >
          {shipment.status}
        </Badge>
      </div>

      {/* Items */}
      <div className="flex flex-wrap items-center gap-2">
        {shipment.items.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-2 rounded-lg border border-border bg-elevated p-1.5 pr-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt=""
              className="size-8 rounded-md border border-border object-cover"
            />
            <div className="flex flex-col">
              <span className="max-w-40 truncate text-xs font-medium text-foreground">
                {item.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Qty {item.quantity}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Status + ETA */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {shipment.status === "Delivered"
              ? `Delivered ${shipment.deliveredDate}`
              : `Expected delivery: ${shipment.estimatedDelivery}`}
          </span>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:text-primary/80 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded"
            aria-expanded={expanded}
          >
            {expanded ? "Hide details" : "Track Package"}
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform",
                expanded && "rotate-90",
              )}
            />
          </button>
        </div>
        <Progress
          value={shipment.progress}
          className="[&_[data-slot=progress-track]]:h-1.5"
        >
          <span className="sr-only">{shipment.progress}% complete</span>
        </Progress>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-elevated p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Carrier</span>
            <span className="font-medium text-foreground">
              {shipment.carrier}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tracking number</span>
            <span className="font-medium tabular-nums text-foreground">
              {shipment.trackingNumber}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estimated arrival</span>
            <span className="font-medium text-foreground">
              {shipment.estimatedDelivery}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShippingPage() {
  const signedIn = useAuthStore((s) => s.signedIn);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);
  const { data: addrData } = useAddresses();
  const { data: shipData } = useShipments();
  const addresses = addrData ?? [];
  const shipments = shipData ?? [];

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Collection"
          subtitle="Status, ETA, and tracking for cards you redeem to ship home."
        />
        {/* Tabs */}
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
          <Link
            href="/collection/activity"
            className="border-b-2 border-transparent pb-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Activity
          </Link>
          <span className="border-b-2 border-primary pb-2 text-sm font-semibold text-foreground">
            Shipping
          </span>
        </div>

        {/* Delivery tracking (reference-style section) */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold text-foreground">
              Delivery tracking
            </h2>
            <p className="text-xs text-muted-foreground">
              Status, ETA, and tracking for cards you redeem to ship home.
            </p>
          </div>
          <EmptyState
            icon={<Truck className="size-6" />}
            title="Connect your account"
            description="Sign in to view outbound shipments and redeem cards."
            primaryAction={
              <Button onClick={() => setSignInOpen(true)}>Sign In</Button>
            }
          />
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Shipping"
        subtitle="Status, ETA, and tracking for your cards and orders."
      />

      {/* Tabs */}
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
        <Link
          href="/collection/activity"
          className="border-b-2 border-transparent pb-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Activity
        </Link>
        <span className="border-b-2 border-primary pb-2 text-sm font-semibold text-foreground">
          Shipping
        </span>
      </div>

      {/* Address */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Shipping address
          </h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Manage
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={cn(
                "flex flex-col gap-2 rounded-2xl border p-4",
                addr.current
                  ? "border-primary/40 bg-surface"
                  : "border-border bg-surface/50",
              )}
            >
              <div className="flex items-center gap-2">
                <MapPin
                  className={cn(
                    "size-4",
                    addr.current ? "text-primary" : "text-muted-foreground",
                  )}
                />
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

      {/* Delivery tracking */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold text-foreground">
              Delivery tracking
            </h2>
            <p className="text-xs text-muted-foreground">
              Status, ETA, and tracking for your outbound shipments.
            </p>
          </div>
          <Badge variant="outline">
            <Package className="size-3" /> {shipments.length} shipments
          </Badge>
        </div>
        <div className="flex flex-col gap-3">
          {shipments.map((s) => (
            <ShipmentCard key={s.id} shipment={s} />
          ))}
        </div>
      </section>
    </div>
  );
}
