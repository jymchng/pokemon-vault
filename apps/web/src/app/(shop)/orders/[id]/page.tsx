"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Truck, Package, MapPin, LogIn } from "lucide-react";
import { useOrder } from "@/lib/hooks/queries";
import { useAuthStore } from "@/lib/store/auth-store";
import { ORDER_STATUSES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const signedIn = useAuthStore((s) => s.signedIn);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);
  const { data: order, isLoading } = useOrder(id);

  if (!signedIn) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong py-24 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
          <LogIn className="size-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Sign in to view this order
        </h2>
        <Button size="lg" onClick={() => setSignInOpen(true)}>
          Sign In / Create Account
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-6 w-40 rounded-lg" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState
        icon={<Package className="size-6" />}
        title="Order not found"
        description="This order doesn't exist or has been removed."
        primaryAction={
          <Button render={<Link href="/orders" />} nativeButton={false}>
            Back to Orders
          </Button>
        }
      />
    );
  }

  const statusIndex = ORDER_STATUSES.indexOf(order.status);

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        render={<Link href="/orders" />}
        nativeButton={false}
      >
        <ArrowLeft className="size-3.5" /> All Orders
      </Button>

      <PageHeader
        title={`Order #${order.number}`}
        subtitle={`Placed ${formatDate(order.date)}`}
        actions={<Badge variant="success">{order.status}</Badge>}
      />

      {/* Status timeline */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          {ORDER_STATUSES.map((status, i) => {
            const reached = i <= statusIndex;
            const isLast = i === ORDER_STATUSES.length - 1;
            return (
              <div
                key={status}
                className="flex flex-1 items-center last:flex-none"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border",
                      reached
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-elevated text-muted-foreground",
                    )}
                  >
                    {reached && i < ORDER_STATUSES.length - 1 ? (
                      <Check className="size-4" />
                    ) : i === ORDER_STATUSES.length - 1 ? (
                      <Truck className="size-4" />
                    ) : (
                      <span className="text-xs font-semibold">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      reached ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {status}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "mx-1 h-0.5 flex-1 rounded-full",
                      i < statusIndex ? "bg-primary" : "bg-elevated",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Items + summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-foreground">Items</h2>
          {order.items.map((item) => (
            <div
              key={item.productId + item.name}
              className="flex items-center gap-3 rounded-xl border border-border bg-elevated p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt=""
                className="size-14 rounded-lg border border-border object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {item.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  Qty {item.quantity}
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-foreground">
            Order Summary
          </h2>
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">
                {formatCurrency(order.total)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-success">Free</span>
            </div>
            <div className="my-1 border-t border-border" />
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-base font-semibold text-foreground">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          <div className="my-1 border-t border-border" />

          <div className="flex flex-col gap-1.5">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase">
              <MapPin className="size-3.5" /> Shipping Address
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {order.address}
            </p>
          </div>

          {order.trackingNumber && (
            <div className="flex flex-col gap-1.5">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase">
                <Truck className="size-3.5" /> Tracking
              </h3>
              <p className="text-xs tabular-nums text-muted-foreground">
                {order.trackingNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.status === "Delivered"
                  ? `Delivered ${order.deliveredDate}`
                  : `Estimated delivery: ${order.estimatedDelivery}`}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
