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
  LogIn,
} from "lucide-react";
import { useUiStore } from "@/lib/store/ui-store";
import { useCartStore } from "@/lib/store/cart-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const pathname = usePathname();
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const setCartOpen = useUiStore((s) => s.setCartOpen);
  const setSignInOpen = useAuthStore((s) => s.setSignInOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const cartCount = useCartStore((s) =>
    s.items.reduce((acc, i) => acc + i.quantity, 0),
  );
  const wishlistCount = useWishlistStore((s) => s.ids.length);
  const signedIn = useAuthStore((s) => s.signedIn);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex h-12 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md md:h-14 md:left-56">
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
        className="group flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface/60 px-3 text-left text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:max-w-xs sm:px-3.5"
        aria-label="Open search"
      >
        <Search className="size-3.5 text-muted-foreground" />
        <span className="hidden flex-1 truncate sm:block">
          Search Pokémon, cards, sets...
        </span>
        <kbd className="hidden rounded border border-border bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
          /
        </kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1">
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
          className="relative overflow-visible text-muted-foreground"
          render={<Link href="/wishlist" />}
          nativeButton={false}
          aria-label={`Wishlist, ${wishlistCount} items`}
        >
          <Heart />
          {wishlistCount > 0 && (
            <span className="absolute top-0 right-0 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {wishlistCount}
            </span>
          )}
        </Button>

        {/* Cart */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative overflow-visible text-muted-foreground"
          onClick={() => setCartOpen(true)}
          aria-label={`Open cart, ${cartCount} items`}
        >
          <ShoppingBag />
          {cartCount > 0 && (
            <span className="absolute top-0 right-0 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
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
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2 py-1.5 text-xs">
                  <span className="block font-semibold text-foreground">
                    Trainer
                  </span>
                  <span className="text-muted-foreground">
                    Level 7 Collector
                  </span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link href="/collection" />}
                nativeButton={false}
              >
                <Layers /> My Collection
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/orders" />}
                nativeButton={false}
              >
                <BagIcon /> Orders
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/rewards" />}
                nativeButton={false}
              >
                <Gift /> Rewards
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link href="/account" />}
                nativeButton={false}
              >
                <Settings /> Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  signOut();
                }}
              >
                <LogOut /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="ml-1 flex items-center">
            {/* Yellow login icon — compact, keeps the search bar wide on all sizes */}
            <Button
              size="icon-sm"
              className="shrink-0"
              onClick={() => setSignInOpen(true)}
              aria-label="Sign in"
            >
              <LogIn className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Active route indicator (kept for future use) */}
      <span className="sr-only">{pathname}</span>
    </header>
  );
}
