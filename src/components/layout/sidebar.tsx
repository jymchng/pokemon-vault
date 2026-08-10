"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, PanelLeft } from "lucide-react";
import { navGroups } from "@/lib/navigation";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex",
        collapsed ? "w-14" : "w-56",
      )}
      aria-label="Main navigation"
    >
      {/* Sidebar header */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        <Logo compact={collapsed} />
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggle}
            aria-label="Collapse sidebar"
            className="text-muted-foreground"
          >
            <PanelLeft />
          </Button>
        )}
      </div>

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggle}
            aria-label="Expand sidebar"
            className="mx-auto mb-2 flex text-muted-foreground"
          >
            <PanelLeft className="rotate-180" />
          </Button>
        )}
        <nav className="flex flex-col gap-4">
          {navGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              {!collapsed && (
                <p className="px-2.5 pb-1 text-[10px] font-semibold tracking-widest text-muted uppercase">
                  {group.label}
                </p>
              )}
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
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex h-8 items-center gap-2.5 rounded-lg text-xs font-medium transition-colors outline-none",
                      collapsed ? "justify-center px-0" : "px-2.5",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-white/5 hover:text-foreground",
                      "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar footer */}
      <div className="shrink-0 border-t border-border p-2">
        <button
          onClick={toggle}
          className={cn(
            "flex h-8 w-full items-center gap-2.5 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            collapsed ? "justify-center px-0" : "px-2.5",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "size-4 transition-transform",
              collapsed && "rotate-180",
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
