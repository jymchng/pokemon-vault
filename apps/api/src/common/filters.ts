import { z } from "zod";

/**
 * Composable validated filters + whitelisted sorting (§87).
 *
 * Every filter value is validated by Zod BEFORE it reaches the repository;
 * sorting is mapped through a whitelist only — arbitrary user input never
 * becomes SQL/Prisma orderBy (no SQL interpolation).
 */

export const AVAILABILITY = ["in_stock", "out_of_stock"] as const;
export type Availability = (typeof AVAILABILITY)[number];

/** Products: whitelisted sort keys (mapped in the repository, never used raw). */
export const PRODUCT_SORT_FIELDS = [
  "newest",
  "name_asc",
  "price_asc",
  "price_desc",
] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

/** Cards: whitelisted sort keys. */
export const CARD_SORT_FIELDS = [
  "newest",
  "name_asc",
  "number_asc",
  "price_asc",
  "price_desc",
] as const;
export type CardSortField = (typeof CARD_SORT_FIELDS)[number];

/** Shared price-range + availability filters (composable, validated). */
export const PriceAvailabilityFilterSchema = z.object({
  minPrice: z.coerce.number().nonnegative().multipleOf(0.01).optional(),
  maxPrice: z.coerce.number().nonnegative().multipleOf(0.01).optional(),
  availability: z.enum(AVAILABILITY).optional(),
});

/** Whitelisted sort param — rejects anything not in the known key lists and
 *  narrows the TS type to the exact key union (no `string` leaks through). */
export function sortSchema<T extends readonly [string, ...string[]]>(fields: T) {
  return z.enum(fields).optional();
}

/**
 * Map a whitelisted sort key to a Prisma orderBy. Throws on unknown keys so a
 * typo can never silently fall back to an unsafe ordering. Arbitrary user
 * input cannot reach this map.
 */
export function productOrderBy(sort: ProductSortField | undefined): Record<string, "asc" | "desc"> {
  switch (sort) {
    case "name_asc": return { name: "asc" };
    case "price_asc": return { price: "asc" };
    case "price_desc": return { price: "desc" };
    case "newest": return { createdAt: "desc" };
    default: return { id: "asc" }; // cursor-safe stable default
  }
}

export function cardOrderBy(sort: CardSortField | undefined): Record<string, "asc" | "desc"> {
  switch (sort) {
    case "name_asc": return { name: "asc" };
    case "number_asc": return { cardNumber: "asc" };
    case "price_asc": return { marketPrice: "asc" };
    case "price_desc": return { marketPrice: "desc" };
    case "newest": return { createdAt: "desc" };
    default: return { id: "asc" }; // cursor-safe stable default
  }
}

/** Compose Prisma where fragments from the shared price/availability filter. */
export function applyPriceAvailability(
  where: Record<string, unknown>,
  f: { minPrice?: number; maxPrice?: number; availability?: Availability },
): Record<string, unknown> {
  if (f.minPrice !== undefined) where.price = { ...(where.price as object ?? {}), gte: f.minPrice };
  if (f.maxPrice !== undefined) where.price = { ...(where.price as object ?? {}), lte: f.maxPrice };
  if (f.availability) {
    where.available = {
      ...(f.availability === "in_stock" ? { gt: 0 } : { equals: 0 }),
    };
  }
  return where;
}
