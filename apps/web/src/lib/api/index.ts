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

/** Simulated network latency so loading states are visible & realistic. */
const LATENCY = 250;
const MOCK_FAILURE_RATE = 0; // 0 = never fail; set >0 to demo error states

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function simulate<T>(data: T, latency = LATENCY): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, latency));
  if (MOCK_FAILURE_RATE > 0 && Math.random() < MOCK_FAILURE_RATE) {
    throw new ApiError("Mock server error", 500);
  }
  return data;
}

/**
 * Fetch from the SQLite-backed API route (/api/data). Falls back to static
 * mock data if the API/DB is unavailable so the UI never looks broken.
 */
const USE_MOCK_FALLBACK = process.env.NEXT_PUBLIC_MOCK_FALLBACK === "true";

async function fromApi<T>(resource: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`/api/data?resource=${resource}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = (await res.json()) as { data: T | null };
    const data = json.data;
    if (data == null || (Array.isArray(data) && data.length === 0)) {
      throw new Error("API empty");
    }
    return data;
  } catch {
    // SQLite is the source of truth. Mock fallback is opt-in for demo/dev only.
    if (USE_MOCK_FALLBACK) return fallback;
    throw new ApiError("Data unavailable", 503);
  }
}

/* ── Cards ─────────────────────────────────────────────── */

export async function fetchCards(): Promise<PokemonCard[]> {
  const data = await fromApi<PokemonCard[]>("cards", cards);
  return simulate(data);
}

export async function fetchCardById(
  id: string,
): Promise<PokemonCard | undefined> {
  await simulate(undefined, 120);
  const data = await fromApi<PokemonCard>(
    `cards&id=${id}`,
    getCardById(id) as PokemonCard,
  );
  return data ?? getCardById(id);
}

/* ── Products ──────────────────────────────────────────── */

export async function fetchProducts(): Promise<Product[]> {
  const data = await fromApi<Product[]>("products", products);
  return simulate(data);
}

export async function fetchProductById(
  id: string,
): Promise<Product | undefined> {
  await simulate(undefined, 120);
  const data = await fromApi<Product>(
    `products&id=${id}`,
    getProductById(id) as Product,
  );
  return data ?? getProductById(id);
}

/* ── Packs ─────────────────────────────────────────────── */

function normalizePack(p: Record<string, unknown>): BoosterPack {
  const contents = p.contents as string | string[] | undefined;
  return {
    slug: String(p.slug),
    name: String(p.name),
    tagline: String(p.tagline),
    price: Number(p.price),
    cardsPerPack: Number(p.cardsPerPack),
    image: String(p.image),
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
  const data = await fromApi<BoosterPack[]>("packs", packs);
  return simulate(
    (data as unknown as Record<string, unknown>[]).map(normalizePack),
  );
}

export async function fetchPackBySlug(
  slug: string,
): Promise<BoosterPack | undefined> {
  await simulate(undefined, 120);
  const data = await fromApi<BoosterPack>(
    `packs&slug=${slug}`,
    getPackBySlug(slug) as BoosterPack,
  );
  const pack = data ?? getPackBySlug(slug);
  return pack
    ? normalizePack(pack as unknown as Record<string, unknown>)
    : undefined;
}

export async function fetchLatestPulls() {
  const data = await fromApi("latest-pulls", latestPulls);
  return simulate(data);
}

/* ── Sets ──────────────────────────────────────────────── */

export async function fetchSets(): Promise<SetInfo[]> {
  const data = await fromApi<SetInfo[]>("sets", sets);
  return simulate(data);
}

/* ── Activity ──────────────────────────────────────────── */

export async function fetchActivity(): Promise<ActivityEvent[]> {
  const data = await fromApi<ActivityEvent[]>("activity", getActivityEvents());
  return simulate(data);
}

export async function fetchPlatformPulls(): Promise<PlatformPull[]> {
  const data = await fromApi<PlatformPull[]>("platform-pulls", platformPulls);
  return simulate(data);
}

/* ── Rewards / Leaderboard ─────────────────────────────── */

export async function fetchRewardTiers() {
  const data = await fromApi("reward-tiers", rewardTiers);
  return simulate(data);
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const data = await fromApi<LeaderboardEntry[]>(
    "leaderboard",
    leaderboardEntries,
  );
  return simulate(data);
}

export async function fetchWaysToWin() {
  const data = await fromApi("ways-to-win", waysToWin);
  return simulate(data);
}

/* ── Shipping ──────────────────────────────────────────── */

export async function fetchAddresses(): Promise<Address[]> {
  const data = await fromApi<Address[]>("addresses", addresses);
  return simulate(data);
}

export async function fetchShipments(): Promise<Shipment[]> {
  const data = await fromApi<Shipment[]>("shipments", shipments);
  return simulate(
    (
      data as (Omit<Shipment, "items"> & {
        items: string | Shipment["items"];
      })[]
    ).map((s) => ({
      ...s,
      items:
        typeof s.items === "string"
          ? (JSON.parse(s.items) as Shipment["items"])
          : s.items,
    })),
  );
}

/* ── Orders ─────────────────────────────────────────────── */

export async function fetchOrders(): Promise<Order[]> {
  const data = await fromApi<Order[]>("orders", orders);
  return simulate(
    (data as (Omit<Order, "items"> & { items: string | Order["items"] })[]).map(
      (o) => ({
        ...o,
        items:
          typeof o.items === "string"
            ? (JSON.parse(o.items) as Order["items"])
            : o.items,
      }),
    ),
  );
}

export async function fetchOrderById(id: string): Promise<Order | undefined> {
  await simulate(undefined, 120);
  const data = await fromApi<Order>(
    `orders&id=${id}`,
    getOrderById(id) as Order,
  );
  const order = data ?? getOrderById(id);
  if (order) {
    const items = (order as unknown as { items: unknown }).items;
    if (typeof items === "string") {
      return { ...order, items: JSON.parse(items) as Order["items"] };
    }
  }
  return order;
}
