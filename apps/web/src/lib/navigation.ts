import {
  LayoutGrid,
  Package,
  Sparkles,
  Layers,
  Heart,
  History,
  ShoppingBag,
  Truck,
  Gift,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Shop",
    items: [
      { label: "Store", href: "/store", icon: LayoutGrid },
      { label: "Booster Packs", href: "/packs", icon: Package, badge: "New" },
      { label: "New Releases", href: "/store?filter=new", icon: Sparkles },
    ],
  },
  {
    label: "Collect",
    items: [
      { label: "My Collection", href: "/collection", icon: Layers },
      { label: "Wishlist", href: "/wishlist", icon: Heart },
      { label: "Recently Viewed", href: "/collection/recent", icon: History },
    ],
  },
  {
    label: "Orders",
    items: [
      { label: "Orders", href: "/orders", icon: ShoppingBag },
      { label: "Shipping", href: "/collection/shipping", icon: Truck },
    ],
  },
  {
    label: "Rewards",
    items: [
      { label: "Rewards", href: "/rewards", icon: Gift },
      { label: "Collector Level", href: "/rewards?tab=level", icon: Trophy },
    ],
  },
];

/** Bottom navigation for mobile */
export const mobileNavItems: NavItem[] = [
  { label: "Home", href: "/", icon: LayoutGrid },
  { label: "Store", href: "/store", icon: ShoppingBag },
  { label: "Packs", href: "/packs", icon: Package },
  { label: "Collection", href: "/collection", icon: Layers },
  { label: "Account", href: "/account", icon: History },
];

/** Search overlay recent searches (mock) */
export const recentSearches = ["Charizard", "Pokémon 151", "Umbreon", "PSA 10"];
