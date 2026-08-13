"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, ShoppingBag, CreditCard, CheckCircle2, LogIn } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/store/cart-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { startCheckout, payOrder } from "@/lib/api";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const syncCart = useCartStore((s) => s.sync);
  const signedIn = useAuthStore((s) => s.signedIn);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);

  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [delivery, setDelivery] = useState("standard");
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const shippingCost =
    delivery === "express" ? 12.99 : delivery === "priority" ? 7.99 : 0;
  const total = subtotal + shippingCost;

  const placeOrder = async () => {
    setPlacing(true);
    try {
      // Real backend flow (§26-28): validate cart → create order (PENDING) →
      // mock payment finalizes reservations → CONFIRMED. Order persisted in
      // Postgres; never a client-side simulation.
      const { order } = await startCheckout({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        email: contact || undefined,
      });
      const orderId = String((order as { id?: string }).id ?? "");
      const paid = await payOrder(orderId, "card");
      setOrderNumber(String((paid as { orderNumber?: string }).orderNumber ?? (order as { orderNumber?: string }).orderNumber ?? ""));
      await clearCart().catch(() => undefined);
      setPlaced(true);
      toast.success("Order placed successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      await syncCart().catch(() => undefined);
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="size-8 text-success" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Order Placed!
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {orderNumber ? `Order ${orderNumber} is confirmed. ` : ""}Track it in
          Orders — your Collector XP is added automatically.
        </p>
        <div className="mt-2 flex gap-3">
          <Button render={<Link href="/orders" />} nativeButton={false}>
            View Orders
          </Button>
          <Button
            variant="outline"
            render={<Link href="/store" />}
            nativeButton={false}
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
          <LogIn className="size-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Sign in to check out
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You'll need an account to complete your purchase.
        </p>
        <Button size="lg" onClick={() => setSignInOpen(true)}>
          Sign In / Create Account
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Checkout" subtitle="Complete your purchase." />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border-strong py-16 text-center">
          <ShoppingBag className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Your cart is empty. Add some cards first.
          </p>
          <Button render={<Link href="/store" />} nativeButton={false}>
            Browse Store
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="flex flex-col gap-5 lg:col-span-2">
            {/* Contact */}
            <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-base font-semibold text-foreground">
                Contact Information
              </h2>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact">Email</Label>
                <Input
                  id="contact"
                  type="email"
                  placeholder="trainer@vault.io"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
            </section>

            {/* Shipping */}
            <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-base font-semibold text-foreground">
                Shipping Address
              </h2>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="12 Pallet Lane"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Celadon City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="zip">ZIP / Postal</Label>
                  <Input
                    id="zip"
                    placeholder="10001"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <span className="text-xs font-semibold text-foreground uppercase">
                  Delivery Method
                </span>
                {[
                  { key: "standard", label: "Standard", eta: "5-7 days", cost: 0 },
                  { key: "priority", label: "Priority", eta: "2-3 days", cost: 7.99 },
                  { key: "express", label: "Express", eta: "1-2 days", cost: 12.99 },
                ].map((d) => (
                  <label
                    key={d.key}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm transition-colors ${
                      delivery === d.key
                        ? "border-primary/50 bg-secondary/20"
                        : "border-border hover:border-border-strong"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      value={d.key}
                      checked={delivery === d.key}
                      onChange={() => setDelivery(d.key)}
                      className="accent-primary"
                    />
                    <span className="flex-1 font-medium text-foreground">
                      {d.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {d.eta}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {d.cost === 0 ? "Free" : formatCurrency(d.cost)}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Payment */}
            <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">
                  Payment
                </h2>
                <Badge variant="outline">
                  <Lock className="size-3" /> Secure Payment
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="card">Card number</Label>
                  <Input
                    id="card"
                    placeholder="4242 4242 4242 4242"
                    value={card}
                    onChange={(e) => setCard(e.target.value)}
                    className="tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Demo checkout — no real payment is processed.
              </p>
            </section>
          </div>

          {/* Order summary */}
          <section className="flex h-fit flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ShoppingBag className="size-4 text-primary" /> Order Summary
            </h2>
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-2 text-xs"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    className="size-8 rounded border border-border object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="flex-1 truncate text-foreground">
                    {item.name}
                  </span>
                  <span className="text-muted-foreground">
                    ×{item.quantity}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="my-1 border-t border-border" />
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-foreground">
                  {shippingCost === 0 ? "Free" : formatCurrency(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-base">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={placeOrder}
              disabled={placing}
            >
              <CreditCard className="size-4" />
              {placing
                ? "Placing Order..."
                : `Place Order · ${formatCurrency(total)}`}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              You'll earn Collector XP on your purchase.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
