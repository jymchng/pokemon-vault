"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  Layers,
  ShoppingBag as BagIcon,
  Gift,
  Settings,
  LogOut,
} from "lucide-react";
import { useUiStore } from "@/lib/store/ui-store";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const pathname = usePathname();
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const setCartOpen = useUiStore((s) => s.setCartOpen);
  const setSignInOpen = useUiStore((s) => s.setSignInOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const cartCount = useCartStore((s) =>
    s.items.reduce((acc, i) => acc + i.quantity, 0),
  );
  const wishlistCount = useWishlistStore((s) => s.ids.length);
  // Mock signed-out state for now
  const signedIn = false;

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md md:left-56">
      {/* Mobile menu + logo */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground md:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu />
      </Button>
      <div className="md:hidden">
        <Logo compact />
      </div>

      {/* Search pill */}
      <button
        onClick={() => setSearchOpen(true)}
        className="group flex h-9 w-full max-w-xs items-center gap-2 rounded-full border border-border bg-surface/60 px-3.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-label="Open search"
      >
        <Search className="size-3.5 text-muted-foreground" />
        <span className="flex-1 truncate">Search Pokémon, cards, sets...</span>
        <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          /
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          aria-label="Notifications"
        >
          <Bell />
        </Button>

        {/* Wishlist */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground"
          render={<Link href="/wishlist" />}
          aria-label={`Wishlist, ${wishlistCount} items`}
        >
          <Heart />
          {wishlistCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {wishlistCount}
            </span>
          )}
        </Button>

        {/* Cart */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground"
          onClick={() => setCartOpen(true)}
          aria-label={`Open cart, ${cartCount} items`}
        >
          <ShoppingBag />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {cartCount}
            </span>
          )}
        </Button>

        {/* Profile / Sign in */}
        {signedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                />
              }
              aria-label="Account menu"
            >
              <User />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="px-2 py-1.5 text-xs">
                <span className="block font-semibold text-foreground">
                  Trainer
                </span>
                <span className="text-muted-foreground">Level 7 Collector</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Layers /> My Collection
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BagIcon /> Orders
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Gift /> Rewards
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings /> Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                <LogOut /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="ml-1 flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setSignInOpen(true)}
            >
              Sign In
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={() => setSignInOpen(true)}
            >
              Create Account
            </Button>
          </div>
        )}
      </div>

      {/* Active route indicator (kept for future use) */}
      <span className="sr-only">{pathname}</span>
    </header>
  );
}
