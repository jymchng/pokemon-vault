"use client";

import Link from "next/link";
import { ShoppingBag, ChevronRight, Truck, LogIn } from "lucide-react";
import { useOrders } from "@/lib/hooks/queries";
import { useAuthStore } from "@/lib/store/auth-store";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { SkeletonRows } from "@/components/ui/skeleton-card";

const statusVariant = {
  "Order Placed": "outline",
  Processing: "warning",
  Packed: "info",
  Shipped: "info",
  Delivered: "success",
} as const;

export default function OrdersPage() {
  const signedIn = useAuthStore((s) => s.signedIn);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);
  const { data: orders, isLoading } = useOrders();

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Orders"
          subtitle="Your order history and delivery status."
        />
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
            <LogIn className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Sign in to view your orders
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Sign in to see your order history and delivery status.
          </p>
          <Button size="lg" onClick={() => setSignInOpen(true)}>
            Sign In / Create Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders"
        subtitle="Your order history and delivery status."
      />

      {isLoading ? (
        <SkeletonRows count={3} />
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="size-6" />}
          title="No orders yet"
          description="When you place an order, it will show up here."
          primaryAction={
            <Button render={<Link href="/store" />} nativeButton={false}>
              Start Shopping
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    #{order.number}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(order.date)}
                  </span>
                </div>
                <Badge
                  variant={
                    statusVariant[order.status as keyof typeof statusVariant]
                  }
                >
                  {order.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {order.items.map((item) => (
                  <div
                    key={item.productId + item.name}
                    className="flex items-center gap-2 rounded-lg border border-border bg-elevated p-1.5 pr-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt=""
                      className="size-8 rounded-md border border-border object-cover"
                      loading="lazy"
                      decoding="async"
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

              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-base font-semibold tabular-nums text-foreground">
                    {formatCurrency(order.total)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {order.status === "Shipped" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-muted-foreground"
                      render={<Link href="/collection/shipping" />}
                      nativeButton={false}
                    >
                      <Truck className="size-3.5" /> Track Order
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    render={<Link href={`/orders/${order.id}`} />}
                    nativeButton={false}
                  >
                    Details <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

