import { cards, getCardById } from "@/lib/data/cards";
import { products, getProductById } from "@/lib/data/products";
import { packs, getPackBySlug, latestPulls } from "@/lib/data/packs";
import { sets } from "@/lib/data/sets";
import { platformPulls, getActivityEvents } from "@/lib/data/activity";
import { rewardTiers, leaderboardEntries, waysToWin } from "@/lib/data/rewards";
import { addresses, shipments } from "@/lib/data/shipping";
import { orders, getOrderById } from "@/lib/data/orders";
import type {
  PokemonCard,
  Product,
  BoosterPack,
  SetInfo,
  ActivityEvent,
  Order,
} from "@/lib/types";
import type { PlatformPull } from "@/lib/data/activity";
import type { LeaderboardEntry } from "@/lib/data/rewards";
import type { Address, Shipment } from "@/lib/data/shipping";

/**
 * Pokémon Vault web → API client (§116).
 *
 * The storefront consumes the real backend at /api/v1 (proxied server-side by
 * next.config.ts rewrites to NEXT_PUBLIC_API_URL). Every function maps the
 * backend's { data, meta } envelope onto the storefront types.
 *
 * Demo-only marketing sections the backend intentionally does not model
 * (leaderboard, ways-to-win, latest-pulls, platform-pulls) keep their static
 * source; NEXT_PUBLIC_MOCK_FALLBACK=true (dev) falls back to static data when
 * the API/DB is unavailable so the UI never looks broken.
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Static-data fallback for demo/marketing resources (no backend model). */
const USE_MOCK_FALLBACK = process.env.NEXT_PUBLIC_MOCK_FALLBACK === "true";

const API_BASE = "/api/v1";

async function fromBackend<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      // Authenticated endpoint without a session — fall back (dev/demo).
      if (USE_MOCK_FALLBACK) return fallback;
      throw new ApiError("Authentication required", res.status);
    }
    if (!res.ok) throw new ApiError(`API ${res.status}`, res.status);
    const json = (await res.json()) as { data: unknown };
    const data = json.data;
    if (data == null) throw new ApiError("API empty", 503);
    return data as T;
  } catch (err) {
    if (USE_MOCK_FALLBACK) return fallback;
    if (err instanceof ApiError) throw err;
    throw new ApiError("Data unavailable", 503);
  }
}

/**
 * The backend paginates list endpoints as `{ data: { items: [...], meta } }`
 * (§86). This normalizes either a plain array or that envelope to an array so
 * callers can map uniformly.
 */
function asList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { items?: unknown }).items)
  ) {
    return (data as { items: unknown[] }).items;
  }
  return [];
}

/** Simulated latency for the static fallback path only (loading states). */
async function simulate<T>(data: T, latency = 250): Promise<T> {
  if (!USE_MOCK_FALLBACK) return data;
  await new Promise((resolve) => setTimeout(resolve, latency));
  return data;
}

/* ── Cards ──────────────────────────────────────────────────────────────── */

function mapCard(c: Record<string, unknown>): PokemonCard {
  return {
    id: String(c.id),
    name: String(c.name ?? ""),
    set: String(c.setName ?? ""),
    cardNumber: String(c.cardNumber ?? ""),
    rarity: (c.rarity as PokemonCard["rarity"]) ?? "Common",
    type: (c.type as PokemonCard["type"]) ?? "Colorless",
    grade: (c.grade as PokemonCard["grade"]) ?? "Ungraded",
    condition: (c.condition as PokemonCard["condition"]) ?? "Mint",
    image: String(c.imageUrl ?? c.image ?? ""),
    owned: Boolean(c.owned),
    quantity: Number(c.quantity ?? 0),
    acquiredAt: String(c.acquiredAt ?? c.createdAt ?? new Date().toISOString()),
    marketPrice: Number(c.marketPrice ?? c.price ?? 0),
    population: c.population != null ? Number(c.population) : undefined,
    description: c.description != null ? String(c.description) : undefined,
    hp: c.hp != null ? Number(c.hp) : undefined,
  };
}

export async function fetchCards(): Promise<PokemonCard[]> {
  const data = await fromBackend<unknown>(
    "/cards?limit=100",
    cards as unknown,
  );
  return simulate(asList(data).map((c) => mapCard(c as Record<string, unknown>)));
}

export async function fetchCardById(
  id: string,
): Promise<PokemonCard | undefined> {
  const data = await fromBackend<Record<string, unknown> | null>(
    `/cards/${id}`,
    getCardById(id) as unknown as Record<string, unknown>,
  );
  const card = data ? mapCard(data) : getCardById(id);
  return card ? simulate(card, 120) : undefined;
}

/* ── Products ───────────────────────────────────────────────────────────── */

function mapProduct(p: Record<string, unknown>): Product {
  const availability = String(p.availability ?? "In Stock") as Product["availability"];
  return {
    id: String(p.id),
    name: String(p.name ?? ""),
    category: (p.category as Product["category"]) ?? "Other",
    set: String(p.setName ?? p.set ?? ""),
    price: Number(p.price ?? 0),
    image: String(p.imageUrl ?? p.image ?? ""),
    stock: Number(p.available ?? p.stock ?? 0),
    rating: Number(p.rating ?? 0),
    availability: ["In Stock", "Low Stock", "Sold Out"].includes(availability)
      ? availability
      : "In Stock",
    description: p.description != null ? String(p.description) : undefined,
    featured: Boolean(p.featured),
    trending: Boolean(p.trending),
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const data = await fromBackend<unknown>(
    "/products?limit=100",
    products as unknown,
  );
  return simulate(
    asList(data).map((p) => mapProduct(p as Record<string, unknown>)),
  );
}

export async function fetchProductById(
  id: string,
): Promise<Product | undefined> {
  const data = await fromBackend<Record<string, unknown> | null>(
    `/products/${id}`,
    getProductById(id) as unknown as Record<string, unknown>,
  );
  const product = data ? mapProduct(data) : getProductById(id);
  return product ? simulate(product, 120) : undefined;
}

/* ── Packs ──────────────────────────────────────────────────────────────── */

function normalizePack(p: Record<string, unknown>): BoosterPack {
  const contents = p.contents as string | string[] | undefined;
  return {
    slug: String(p.slug ?? p.id ?? ""),
    name: String(p.name ?? ""),
    tagline: String(p.tagline ?? ""),
    price: Number(p.price ?? 0),
    cardsPerPack: Number(p.cardsPerPack ?? 10),
    image: String(p.image ?? ""),
    availability: (p.availability ?? "In Stock") as BoosterPack["availability"],
    contents:
      typeof contents === "string"
        ? (JSON.parse(contents) as string[])
        : ((contents ?? []) as string[]),
    odds: {
      common: Number(p.oddsCommon ?? 0),
      uncommon: Number(p.oddsUncommon ?? 0),
      rare: Number(p.oddsRare ?? 0),
      ultraRare: Number(p.oddsUltra ?? 0),
      secretRare: Number(p.oddsSecret ?? 0),
    },
    featured: Boolean(p.featured),
  };
}

export async function fetchPacks(): Promise<BoosterPack[]> {
  const data = await fromBackend<unknown[]>(
    "/packs",
    packs as unknown as unknown[],
  );
  return simulate((data as Record<string, unknown>[]).map(normalizePack));
}

export async function fetchPackBySlug(
  slug: string,
): Promise<BoosterPack | undefined> {
  const data = await fromBackend<Record<string, unknown> | null>(
    `/packs/${slug}`,
    getPackBySlug(slug) as unknown as Record<string, unknown>,
  );
  const pack = data ? normalizePack(data) : getPackBySlug(slug);
  return pack ? simulate(pack, 120) : undefined;
}

export async function fetchLatestPulls() {
  // Backend does not model this demo section — static source only.
  return simulate(latestPulls);
}

/* ── Sets ───────────────────────────────────────────────────────────────── */

function mapSet(s: Record<string, unknown>): SetInfo {
  return {
    id: String(s.id ?? s.slug ?? ""),
    name: String(s.name ?? ""),
    symbol: String(s.symbol ?? s.symbolUrl ?? ""),
    releaseYear: Number(
      s.releaseYear ??
        (s.releaseDate ? new Date(String(s.releaseDate)).getFullYear() : 2024),
    ),
    totalCards: Number(s.totalCards ?? 0),
    collected: Number(s.collected ?? 0),
    image: String(s.image ?? s.logoUrl ?? ""),
  };
}

export async function fetchSets(): Promise<SetInfo[]> {
  const data = await fromBackend<unknown[]>(
    "/sets",
    sets as unknown as unknown[],
  );
  return simulate((data as Record<string, unknown>[]).map(mapSet));
}

/* ── Activity / platform pulls (demo sections — static source) ─────────── */

export async function fetchActivity(): Promise<ActivityEvent[]> {
  return simulate(getActivityEvents());
}

export async function fetchPlatformPulls(): Promise<PlatformPull[]> {
  return simulate(platformPulls);
}

/* ── Rewards / leaderboard ──────────────────────────────────────────────── */

export async function fetchRewardTiers() {
  // Backend: /rewards/tiers → [{ id, name, level, xpRequired }].
  const data = await fromBackend<unknown[]>(
    "/rewards/tiers",
    rewardTiers as unknown as unknown[],
  );
  return simulate(
    (data as Record<string, unknown>[]).map((t) => ({
      id: String(t.id ?? t.level ?? ""),
      xp: Number(t.xpRequired ?? t.xp ?? 0),
      label: String(t.name ?? t.label ?? ""),
      icon: String(t.icon ?? ""),
    })),
  );
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  // Demo-only marketing section — static source.
  return simulate(leaderboardEntries);
}

export async function fetchWaysToWin() {
  return simulate(waysToWin);
}

/* ── Shipping ───────────────────────────────────────────────────────────── */

function mapAddress(a: Record<string, unknown>): Address {
  return {
    id: String(a.id),
    label: String(a.label ?? ""),
    name: String(a.name ?? ""),
    line1: String(a.line1 ?? ""),
    line2: a.line2 != null ? String(a.line2) : undefined,
    city: String(a.city ?? ""),
    state: String(a.state ?? ""),
    postal: String(a.postal ?? ""),
    country: String(a.country ?? "US"),
    current: Boolean(a.isDefault ?? a.current),
  };
}

export async function fetchAddresses(): Promise<Address[]> {
  const data = await fromBackend<unknown[]>(
    "/shipping/addresses",
    addresses as unknown as unknown[],
  );
  return simulate((data as Record<string, unknown>[]).map(mapAddress));
}

export async function fetchShipments(): Promise<Shipment[]> {
  const data = await fromBackend<unknown[]>(
    "/shipping/shipments",
    shipments as unknown as unknown[],
  );
  return simulate(
    (data as Record<string, unknown>[]).map((s) => {
      const items = s.items as string | Shipment["items"] | undefined;
      return {
        ...s,
        items:
          typeof items === "string"
            ? (JSON.parse(items) as Shipment["items"])
            : ((items ?? []) as Shipment["items"]),
      } as Shipment;
    }),
  );
}

/* ── Orders ─────────────────────────────────────────────────────────────── */

function mapOrder(o: Record<string, unknown>): Order {
  return {
    id: String(o.id ?? ""),
    number: String(o.orderNumber ?? o.number ?? ""),
    date: String(o.createdAt ?? o.date ?? new Date().toISOString()),
    items: Array.isArray(o.items)
      ? (o.items as unknown[]).map((it: unknown) => {
          const i = it as Record<string, unknown>;
          return {
            productId: String(i.productId ?? ""),
            name: String(i.productName ?? i.name ?? ""),
            image: String(i.image ?? ""),
            price: Number(i.unitPrice ?? i.price ?? 0),
            quantity: Number(i.quantity ?? 0),
          };
        })
      : [],
    total: Number(o.total ?? 0),
    status: (o.status as Order["status"]) ?? "Order Placed",
    trackingNumber: o.trackingNumber != null ? String(o.trackingNumber) : undefined,
    estimatedDelivery:
      o.estimatedDelivery != null ? String(o.estimatedDelivery) : undefined,
    deliveredDate: o.deliveredDate != null ? String(o.deliveredDate) : undefined,
    address: String(o.address ?? ""),
  };
}

export async function fetchOrders(): Promise<Order[]> {
  const data = await fromBackend<unknown>(
    "/orders?limit=50",
    orders as unknown,
  );
  return simulate(asList(data).map((o) => mapOrder(o as Record<string, unknown>)));
}

export async function fetchOrderById(id: string): Promise<Order | undefined> {
  const data = await fromBackend<Record<string, unknown> | null>(
    `/orders/${id}`,
    getOrderById(id) as unknown as Record<string, unknown>,
  );
  const order = data ? mapOrder(data) : getOrderById(id);
  return order ? simulate(order, 120) : undefined;
}
