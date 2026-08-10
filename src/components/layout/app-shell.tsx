"use client";

import { type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { MobileNav } from "./mobile-nav";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { Footer } from "./footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SearchOverlay } from "@/components/navigation/search-overlay";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { Toaster } from "@/components/ui/sonner";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <TopBar />
      <div
        className={cn(
          "flex min-h-screen flex-col pt-14 transition-[padding] duration-200 md:pl-56",
          collapsed && "md:pl-14",
        )}
      >
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6 pb-24 md:py-8 md:pb-12">
          {children}
        </main>
        <div className="hidden md:block">
          <Footer />
        </div>
      </div>
      <MobileNav />
      <MobileNavDrawer />
      <CartDrawer />
      <SearchOverlay />
      <SignInModal />
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
