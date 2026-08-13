/**
 * Pokémon Vault web → API client (all data from the real backend).
 *
 * Every function hits the NestJS backend at /api/v1 (proxied server-side by
 * next.config.ts rewrites to POKE_VAULT_NEXT_PUBLIC_API_URL). No static mock
 * fallbacks exist: failures surface as ApiError with a stable HTTP status.
 *
 * Auth: the access token (from auth-store) is attached as `Authorization:
 * Bearer <token>` on every request. 401 → ApiError("Authentication required",
 * 401) which the UI turns into a sign-in prompt.
 */
import type {
  PokemonCard,
  Product,
  BoosterPack,
  SetInfo,
  ActivityEvent,
  Order,
  PlatformPull,
  LeaderboardEntry,
  Address,
  Shipment,
} from "@/lib/types";

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  /** Field-level validation issues from the backend (e.g. password policy). */
  details?: ApiErrorDetail[];
  constructor(
    message: string,
    status = 500,
    code?: string,
    details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const API_BASE = "/api/v1";

/** Access token holder — set by auth-store; read here to avoid circular imports. */
let _token: string | null = null;
export function setAccessToken(token: string | null) {
  _token = token;
}
export function getAccessToken(): string | null {
  return _token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: unknown;
    error?: {
      code?: string;
      message?: string;
      details?: { path: string; message: string }[];
    };
  };
  if (!res.ok) {
    const code = json.error?.code;
    const message =
      res.status === 401 || res.status === 403
        ? "Authentication required"
        : json.error?.message || `API ${res.status}`;
    throw new ApiError(message, res.status, code, json.error?.details);
  }
  if (json.data == null) throw new ApiError("API empty", 503);
  return json.data as T;
}

/** GET returning the raw `data` payload. */
const get = <T>(path: string) => request<T>(path);

/** POST with a JSON body. */
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

/** PATCH with a JSON body. */
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(body) });

/** DELETE. */
const del = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "DELETE",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

/**
 * The backend paginates list endpoints as `{ data: { items: [...], meta } }`
 * (§86). Normalize either a plain array or that envelope to an array.
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

/* ── Auth ──────────────────────────────────────────────────────────────── */

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
  role: string;
}

interface AuthResultDto {
  user: AuthUser;
  accessToken: string;
}

export async function apiRegister(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<AuthResultDto> {
  return post<AuthResultDto>("/auth/register", input);
}

export async function apiLogin(input: {
  email: string;
  password: string;
}): Promise<AuthResultDto> {
  return post<AuthResultDto>("/auth/login", input);
}

export async function apiMe(): Promise<{ user: AuthUser }> {
  return get<{ user: AuthUser }>("/auth/me");
}

export async function apiLogout(): Promise<void> {
  await post<unknown>("/auth/logout", {}).catch(() => undefined);
}

export interface PasswordPolicyDto {
  minLength: number;
  maxLength: number;
  minCharacterClasses: number;
  minEntropyBits: number;
  requirements: { key: string; label: string }[];
}

/** Public: config-driven password requirements (no hardcoded labels in the UI). */
export async function fetchPasswordPolicy(): Promise<PasswordPolicyDto> {
  return get<PasswordPolicyDto>("/auth/password-policy");
}

/* ── Cards ─────────────────────────────────────────────────────────────── */

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
    image: String(
      c.imageUrl ?? c.image ?? "/images/placeholder-card.png",
    ),
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
  const data = await get<unknown>("/cards?limit=100");
  return asList(data).map((c) => mapCard(c as Record<string, unknown>));
}

export async function fetchCardById(
  id: string,
): Promise<PokemonCard | undefined> {
  const data = await get<Record<string, unknown> | null>(`/cards/${id}`);
  return data ? mapCard(data) : undefined;
}

/* ── Products ──────────────────────────────────────────────────────────── */

function mapProduct(p: Record<string, unknown>): Product {
  const availability = String(p.availability ?? "In Stock") as Product["availability"];
  return {
    id: String(p.id),
    name: String(p.name ?? ""),
    category: (p.category as Product["category"]) ?? "Other",
    set: String(p.setName ?? p.set ?? ""),
    price: Number(p.price ?? 0),
    image: String(p.imageUrl ?? p.image ?? "/images/placeholder-card.png"),
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
  const data = await get<unknown>("/products?limit=100");
  return asList(data).map((p) => mapProduct(p as Record<string, unknown>));
}

export async function fetchProductById(
  id: string,
): Promise<Product | undefined> {
  const data = await get<Record<string, unknown> | null>(`/products/${id}`);
  return data ? mapProduct(data) : undefined;
}

/* ── Packs ─────────────────────────────────────────────────────────────── */

function normalizePack(p: Record<string, unknown>): BoosterPack {
  const contents = p.contents as string | string[] | undefined;
  return {
    slug: String(p.slug ?? p.id ?? ""),
    name: String(p.name ?? ""),
    tagline: String(p.tagline ?? ""),
    price: Number(p.price ?? 0),
    cardsPerPack: Number(p.cardsPerPack ?? 10),
    image: String(p.image ?? "/images/placeholder-card.png"),
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
  const data = await get<unknown[]>("/packs");
  return (data as Record<string, unknown>[]).map(normalizePack);
}

export async function fetchPackBySlug(
  slug: string,
): Promise<BoosterPack | undefined> {
  const data = await get<Record<string, unknown> | null>(`/packs/${slug}`);
  return data ? normalizePack(data) : undefined;
}

export interface PackOpeningResult {
  id: string;
  packId: string;
  cards: { id: string; name: string; rarity: string; setName?: string; imageUrl?: string }[];
  createdAt: string;
}

export async function openPack(
  slugOrId: string,
  idempotencyKey?: string,
): Promise<PackOpeningResult> {
  return post<PackOpeningResult>(`/packs/${slugOrId}/open`, {
    ...(idempotencyKey ? { idempotencyKey } : {}),
  });
}

/* ── Sets ──────────────────────────────────────────────────────────────── */

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
  const data = await get<unknown[]>("/sets");
  return (data as Record<string, unknown>[]).map(mapSet);
}

export async function fetchSetBySlugOrId(
  slugOrId: string,
): Promise<SetInfo | undefined> {
  const data = await get<Record<string, unknown> | null>(`/sets/${slugOrId}`);
  return data ? mapSet(data) : undefined;
}

/* ── Rewards ───────────────────────────────────────────────────────────── */

export interface RewardAccount {
  xp: number;
  level: number;
  tierName?: string | null;
  progress?: { currentTierXp: number; nextTierXp: number; percent: number } | null;
}

export async function fetchRewardTiers(): Promise<
  { id: string; xp: number; label: string; icon: string }[]
> {
  const data = await get<unknown[]>("/rewards/tiers");
  return (data as Record<string, unknown>[]).map((t) => ({
    id: String(t.id ?? t.level ?? ""),
    xp: Number(t.xpRequired ?? t.xp ?? 0),
    label: String(t.name ?? t.label ?? ""),
    icon: String(t.icon ?? ""),
  }));
}

export async function fetchRewardAccount(): Promise<RewardAccount> {
  return get<RewardAccount>("/rewards/me");
}

/* ── Cart ──────────────────────────────────────────────────────────────── */

export interface CartItemDto {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  available: number;
}

export interface CartDto {
  id: string;
  items: CartItemDto[];
  subtotal: number;
  itemCount: number;
}

export async function fetchCart(): Promise<CartDto> {
  return get<CartDto>("/cart/items");
}

export async function addCartItem(
  productId: string,
  quantity = 1,
): Promise<CartDto> {
  return post<CartDto>("/cart/items", { productId, quantity });
}

export async function updateCartItem(
  productId: string,
  quantity: number,
): Promise<CartDto> {
  return patch<CartDto>(`/cart/items/${productId}`, { quantity });
}

export async function removeCartItem(productId: string): Promise<CartDto> {
  return del<CartDto>(`/cart/items/${productId}`);
}

export async function clearCart(): Promise<CartDto> {
  return del<CartDto>("/cart/items");
}

/* ── Wishlist ──────────────────────────────────────────────────────────── */

export interface WishlistItemDto {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  price: number;
  status: string;
}

export async function fetchWishlist(): Promise<WishlistItemDto[]> {
  const data = await get<unknown[]>("/wishlist/items");
  return (data as Record<string, unknown>[]).map((w) => ({
    id: String(w.id),
    productId: String(w.productId),
    sku: String(w.sku ?? ""),
    productName: String(w.productName ?? ""),
    price: Number(w.price ?? 0),
    status: String(w.status ?? ""),
  }));
}

export async function addWishlistItem(productId: string): Promise<void> {
  await post<unknown>("/wishlist/items", { productId });
}

export async function removeWishlistItem(productId: string): Promise<void> {
  await del<unknown>(`/wishlist/items/${productId}`);
}

/* ── Collection ────────────────────────────────────────────────────────── */

export interface CollectionItemDto {
  id: string;
  cardId: string;
  cardName: string;
  cardNumber: string | null;
  rarity: string | null;
  setName: string;
  quantity: number;
  condition: string | null;
  grade: string | null;
  source: string;
  acquiredAt: string | null;
}

export interface SetProgressDto {
  setId: string;
  setName: string;
  slug: string;
  ownedCards: number;
  totalCards: number;
  completionPercentage: number;
}

export async function fetchCollectionItems(): Promise<CollectionItemDto[]> {
  const data = await get<unknown[]>("/collection/items");
  return (data as Record<string, unknown>[]).map((c) => ({
    id: String(c.id),
    cardId: String(c.cardId),
    cardName: String(c.cardName ?? ""),
    cardNumber: c.cardNumber != null ? String(c.cardNumber) : null,
    rarity: c.rarity != null ? String(c.rarity) : null,
    setName: String(c.setName ?? ""),
    quantity: Number(c.quantity ?? 0),
    condition: c.condition != null ? String(c.condition) : null,
    grade: c.grade != null ? String(c.grade) : null,
    source: String(c.source ?? ""),
    acquiredAt: c.acquiredAt != null ? String(c.acquiredAt) : null,
  }));
}

export async function fetchCollectionSets(): Promise<SetProgressDto[]> {
  const data = await get<unknown[]>("/collection/sets");
  return (data as Record<string, unknown>[]).map((s) => ({
    setId: String(s.setId),
    setName: String(s.setName ?? ""),
    slug: String(s.slug ?? ""),
    ownedCards: Number(s.ownedCards ?? 0),
    totalCards: Number(s.totalCards ?? 0),
    completionPercentage: Number(s.completionPercentage ?? 0),
  }));
}

export async function fetchCollectionActivity(): Promise<ActivityEvent[]> {
  const data = await get<unknown[]>("/collection/activity");
  return (data as Record<string, unknown>[]).map((a) => {
    const rawType = String(a.eventType ?? "CARD_ADDED");
    const meta = (a.metadata ?? {}) as Record<string, unknown>;
    const typeMap: Record<string, ActivityEvent["type"]> = {
      CARD_ADDED: "added",
      CARD_REMOVED: "sold",
      PACK_OPENED: "opened_pack",
      ORDER_COMPLETED: "purchased",
      REWARD_EARNED: "purchased",
      REWARD_REDEEMED: "purchased",
    };
    return {
      id: String(a.id),
      type: typeMap[rawType] ?? "added",
      title: String(meta.title ?? a.entityType ?? "Activity"),
      subtitle: String(meta.subtitle ?? ""),
      image: String(meta.image ?? "/images/placeholder-card.png"),
      date: String(a.createdAt ?? new Date().toISOString()),
    };
  });
}

export async function addCollectionItem(
  cardId: string,
  quantity = 1,
): Promise<void> {
  await post<unknown>("/collection/items", { cardId, quantity });
}

/* ── Orders ────────────────────────────────────────────────────────────── */

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
  const data = await get<unknown>("/orders?limit=50");
  return asList(data).map((o) => mapOrder(o as Record<string, unknown>));
}

export async function fetchOrderById(id: string): Promise<Order | undefined> {
  const data = await get<Record<string, unknown> | null>(`/orders/${id}`);
  return data ? mapOrder(data) : undefined;
}

/* ── Shipping ──────────────────────────────────────────────────────────── */

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
  const data = await get<unknown[]>("/shipping/addresses");
  return (data as Record<string, unknown>[]).map(mapAddress);
}

export async function fetchShipments(): Promise<Shipment[]> {
  const data = await get<unknown[]>("/shipping/shipments");
  return (data as Record<string, unknown>[]).map((s) => {
    const items = s.items as string | Shipment["items"] | undefined;
    return {
      ...s,
      items:
        typeof items === "string"
          ? (JSON.parse(items) as Shipment["items"])
          : ((items ?? []) as Shipment["items"]),
    } as Shipment;
  });
}

/* ── Checkout ──────────────────────────────────────────────────────────── */

export interface CheckoutResult {
  order: Record<string, unknown>;
  reservations?: unknown[];
}

export async function startCheckout(
  body: { items?: { productId: string; quantity: number }[]; email?: string } = {},
): Promise<CheckoutResult> {
  return post<CheckoutResult>("/checkout", body);
}

export async function payOrder(
  orderId: string,
  paymentMethod = "card",
): Promise<Record<string, unknown>> {
  return post<Record<string, unknown>>(`/checkout/${orderId}/pay`, {
    paymentMethod,
  });
}

/* ── Search ────────────────────────────────────────────────────────────── */

export async function searchCatalog(query: string): Promise<{
  products: Product[];
  cards: PokemonCard[];
}> {
  const data = await get<{
    products?: unknown[];
    cards?: unknown[];
  }>(`/search?q=${encodeURIComponent(query)}`);
  return {
    products: (data.products ?? []).map((p) =>
      mapProduct(p as Record<string, unknown>),
    ),
    cards: (data.cards ?? []).map((c) => mapCard(c as Record<string, unknown>)),
  };
}
