"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { navGroups, mobileNavItems } from "@/lib/navigation";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

/** Mobile slide-in navigation drawer (opened via the top-bar hamburger). */
export function MobileNavDrawer() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      {/* Drawer */}
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-sidebar shadow-modal">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Logo />
          <button
            onClick={() => setOpen(false)}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label="Close navigation menu"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Quick nav (bottom-nav items) */}
        <div className="border-b border-border px-3 py-3">
          <p className="px-2 pb-1 text-[10px] font-semibold tracking-widest text-muted uppercase">
            Quick
          </p>
          <nav className="flex flex-col gap-0.5">
            {mobileNavItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-white/5 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Full nav groups */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-3 flex flex-col gap-0.5">
              <p className="px-2 pb-1 text-[10px] font-semibold tracking-widest text-muted uppercase">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" &&
                    pathname.startsWith(item.href.split("?")[0]));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
