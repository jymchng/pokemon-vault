export type Rarity =
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Holo Rare"
  | "Ultra Rare"
  | "Illustration Rare"
  | "Special Illustration Rare"
  | "Secret Rare";

export type Grade =
  "Ungraded" | `PSA ${number}` | `CGC ${number}` | `BGS ${number}`;

export type CardCondition =
  "Gem Mint" | "Mint" | "Near Mint" | "Excellent" | "Good";

export type PokemonType =
  | "Fire"
  | "Water"
  | "Grass"
  | "Electric"
  | "Psychic"
  | "Fighting"
  | "Darkness"
  | "Metal"
  | "Fairy"
  | "Dragon"
  | "Colorless";

export interface PokemonCard {
  id: string;
  name: string;
  set: string;
  cardNumber: string;
  rarity: Rarity;
  type: PokemonType;
  grade: Grade;
  condition: CardCondition;
  image: string;
  owned: boolean;
  quantity: number;
  acquiredAt: string;
  marketPrice: number;
  population?: number;
  description?: string;
  hp?: number;
}

export type ProductCategory =
  | "Single Card"
  | "Booster Pack"
  | "Booster Box"
  | "Elite Trainer Box"
  | "Graded Card"
  | "Accessory"
  | "Collection";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  set: string;
  price: number;
  image: string;
  stock: number;
  rating: number;
  availability: "In Stock" | "Low Stock" | "Sold Out";
  description?: string;
  featured?: boolean;
  trending?: boolean;
}

export interface BoosterPack {
  slug: string;
  name: string;
  tagline: string;
  price: number;
  cardsPerPack: number;
  image: string;
  availability: "In Stock" | "Low Stock" | "Sold Out";
  odds: {
    common: number;
    uncommon: number;
    rare: number;
    ultraRare: number;
    secretRare: number;
  };
  contents: string[];
  featured?: boolean;
}

export interface SetInfo {
  id: string;
  name: string;
  symbol: string;
  releaseYear: number;
  totalCards: number;
  collected: number;
  image: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export type OrderStatus =
  "Order Placed" | "Processing" | "Packed" | "Shipped" | "Delivered";

export interface Order {
  id: string;
  number: string;
  date: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  trackingNumber?: string;
  estimatedDelivery?: string;
  deliveredDate?: string;
  address: string;
}

export interface ActivityEvent {
  id: string;
  type: "added" | "purchased" | "opened_pack" | "sold" | "shipped";
  title: string;
  subtitle: string;
  image?: string;
  date: string;
  xp?: number;
}

export interface RewardTier {
  id: string;
  xp: number;
  label: string;
  icon: string;
}

export interface CollectorState {
  xp: number;
  level: number;
}

export interface Address {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  current?: boolean;
}

export interface Shipment {
  id: string;
  orderNumber: string;
  status: "In Transit" | "Delivered" | "Processing" | "Out for Delivery";
  carrier: string;
  trackingNumber: string;
  estimatedDelivery: string;
  deliveredDate?: string;
  items: { name: string; image: string; quantity: number }[];
  progress: number; // 0-100 timeline progress
}

export interface PlatformPull {
  id: string;
  title: string;
  condition: string;
  packPrice: string;
  value: number;
  time: string;
  image: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  handle: string;
  xp: number;
  packs: number;
  avatarColor: string;
}

/** Storefront catalog filter/sort options (UI-only, from the backend catalog). */
export const CATEGORIES = [
  "All Products",
  "Single Card",
  "Booster Pack",
  "Booster Box",
  "Elite Trainer Box",
  "Graded Card",
  "Accessory",
] as const;

export const SORT_OPTIONS = [
  { key: "featured", label: "Featured" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "name_asc", label: "Name: A to Z" },
  { key: "rating", label: "Top Rated" },
] as const;

export type ProductSortKey = (typeof SORT_OPTIONS)[number]["key"];

/** Collection filter option lists (UI-only). */
export const SET_FILTERS = [
  "All Sets",
  "Scarlet & Violet",
  "Obsidian Flames",
  "151",
  "Temporal Forces",
  "Paldean Fates",
  "Twilight Masquerade",
] as const;

export const RARITY_FILTERS = [
  "All Rarities",
  "Common",
  "Uncommon",
  "Rare",
  "Holo Rare",
  "Ultra Rare",
  "Illustration Rare",
  "Special Illustration Rare",
  "Secret Rare",
] as const;

export const GRADE_FILTERS = [
  "Any Grade",
  "Ungraded",
  "PSA 10",
  "PSA 9",
  "CGC 10",
  "BGS 10",
] as const;

export const TYPE_FILTERS = [
  "All Types",
  "Fire",
  "Water",
  "Grass",
  "Electric",
  "Psychic",
  "Fighting",
  "Darkness",
  "Metal",
  "Fairy",
  "Dragon",
  "Colorless",
] as const;

/** Order status timeline (UI). Backend statuses map onto these display labels. */
export const ORDER_STATUSES = [
  "Order Placed",
  "Processing",
  "Packed",
  "Shipped",
  "Delivered",
] as const;
