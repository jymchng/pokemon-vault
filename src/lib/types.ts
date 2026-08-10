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
