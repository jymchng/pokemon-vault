"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-border bg-sidebar/95 backdrop-blur-md md:hidden"
      aria-label="Mobile navigation"
    >
      {mobileNavItems.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors outline-none focus-visible:text-primary",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
