import { cards, getCardById } from "@/lib/data/cards";
import { products, getProductById } from "@/lib/data/products";
import { packs, getPackBySlug, latestPulls } from "@/lib/data/packs";
import { sets } from "@/lib/data/sets";
import { platformPulls, getActivityEvents } from "@/lib/data/activity";
import { rewardTiers, leaderboardEntries, waysToWin } from "@/lib/data/rewards";
import { addresses, shipments } from "@/lib/data/shipping";
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
const MOCK_FAILURE_RATE = 0; // 0 = never fail (deterministic demo); set >0 to demo error states

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

/* ── Cards ─────────────────────────────────────────────── */

export async function fetchCards(): Promise<PokemonCard[]> {
  return simulate(cards);
}

export async function fetchCardById(
  id: string,
): Promise<PokemonCard | undefined> {
  await simulate(undefined, 120);
  return getCardById(id);
}

/* ── Products ──────────────────────────────────────────── */

export async function fetchProducts(): Promise<Product[]> {
  return simulate(products);
}

export async function fetchProductById(
  id: string,
): Promise<Product | undefined> {
  await simulate(undefined, 120);
  return getProductById(id);
}

/* ── Packs ─────────────────────────────────────────────── */

export async function fetchPacks(): Promise<BoosterPack[]> {
  return simulate(packs);
}

export async function fetchPackBySlug(
  slug: string,
): Promise<BoosterPack | undefined> {
  await simulate(undefined, 120);
  return getPackBySlug(slug);
}

export async function fetchLatestPulls() {
  return simulate(latestPulls);
}

/* ── Sets ──────────────────────────────────────────────── */

export async function fetchSets(): Promise<SetInfo[]> {
  return simulate(sets);
}

/* ── Activity ──────────────────────────────────────────── */

export async function fetchActivity(): Promise<ActivityEvent[]> {
  return simulate(getActivityEvents());
}

export async function fetchPlatformPulls(): Promise<PlatformPull[]> {
  return simulate(platformPulls);
}

/* ── Rewards / Leaderboard ─────────────────────────────── */

export async function fetchRewardTiers() {
  return simulate(rewardTiers);
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  return simulate(leaderboardEntries);
}

export async function fetchWaysToWin() {
  return simulate(waysToWin);
}

/* ── Shipping ──────────────────────────────────────────── */

export async function fetchAddresses(): Promise<Address[]> {
  return simulate(addresses);
}

export async function fetchShipments(): Promise<Shipment[]> {
  return simulate(shipments);
}

/* ── Orders (mock; kept for future /orders) ────────────── */

export async function fetchOrders(): Promise<Order[]> {
  return simulate([] as Order[]);
}
