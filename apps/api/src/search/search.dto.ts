import { z } from "zod";

/** Whitelisted sortable fields (§46) — never interpolate arbitrary params. */
export const PRODUCT_SORT_FIELDS = ["relevance", "price_asc", "price_desc", "name_asc", "newest"] as const;
export const CARD_SORT_FIELDS = ["relevance", "name_asc", "number_asc", "newest"] as const;

export const SearchSchema = z.object({
  q: z.string().max(200).optional(),
  type: z.enum(["products", "cards"]).optional().default("products"),
  // Filters (validated; whitelisted)
  set: z.string().max(100).optional(),
  rarity: z.string().max(100).optional(),
  cardType: z.string().max(50).optional(),
  grade: z.string().max(20).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  category: z.string().max(100).optional(),
  availability: z.enum(["in_stock", "out_of_stock"]).optional(),
  // Whitelisted sort (validated against the field lists in the service)
  sort: z
    .string()
    .refine((v) => v === "" || [...PRODUCT_SORT_FIELDS, ...CARD_SORT_FIELDS].includes(v as any), {
      message: "sort must be one of the whitelisted fields",
    })
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SearchDto = z.infer<typeof SearchSchema>;

export interface SearchResultItem {
  id: string;
  name: string;
  slug?: string;
  sku?: string;
  price?: number;
  category?: string | null;
  productType?: string;
  status?: string;
  available?: number;
  setName?: string;
  cardNumber?: string | null;
  rarity?: string | null;
  type?: string | null;
  grade?: string | null;
  score?: number;
}

export interface SearchResult {
  items: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
}
