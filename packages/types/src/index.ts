/**
 * Shared frontend↔backend contract (§100): response envelope, error envelope,
 * pagination shapes, and auth types. Both the API and the web app import this
 * package so schemas/enums/pagination/errors/auth stay in lockstep.
 */

/** Success envelope (§50): every 2xx response is { data, meta? }. */
export interface ApiResponse<T, M = undefined> {
  data: T;
  meta?: M;
}

/** Stable error envelope (§102). */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { path: string; message: string }[];
  };
}

/** Stable machine-readable error codes (§102). */
export const ERROR_CODES = [
  "BAD_REQUEST",
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "UNPROCESSABLE_ENTITY",
  "TOO_MANY_REQUESTS",
  "FEATURE_DISABLED",
  "INTERNAL_ERROR",
  "SERVICE_UNAVAILABLE",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Cursor pagination meta (§86) — high-volume endpoints. */
export interface CursorPageMeta {
  nextCursor: string | null;
  hasMore: boolean;
}
export interface CursorPage<T> {
  items: T[];
  meta: CursorPageMeta;
}

/** Offset pagination meta — small admin tables. */
export interface OffsetPageMeta {
  total: number;
  page: number;
  limit: number;
}
export interface OffsetPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Auth (§8-10). */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: "CUSTOMER" | "STAFF" | "ADMIN" | "SUPER_ADMIN";
  emailVerified: boolean;
}
export interface AuthSession {
  id: string;
  device: string | null;
  ipAddress: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}
export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

/** Whitelisted sort fields (§87) shared with the API schemas. */
export const PRODUCT_SORT_FIELDS = ["newest", "name_asc", "price_asc", "price_desc"] as const;
export const CARD_SORT_FIELDS = ["newest", "name_asc", "number_asc", "price_asc", "price_desc"] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];
export type CardSortField = (typeof CARD_SORT_FIELDS)[number];

/** Shared enums (§11, §15, §22). */
export const USER_ROLES = ["CUSTOMER", "STAFF", "ADMIN", "SUPER_ADMIN"] as const;
export const ORDER_STATUSES = [
  "PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED",
  "DELIVERED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED",
] as const;
export const PRODUCT_TYPES = [
  "SINGLE_CARD", "BOOSTER_PACK", "BOOSTER_BOX", "ELITE_TRAINER_BOX",
  "GRADED_CARD", "ACCESSORY", "COLLECTION", "OTHER",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type ProductType = (typeof PRODUCT_TYPES)[number];
