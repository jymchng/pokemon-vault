import { describe, expect, it } from "vitest";
import {
  cardOrderBy,
  CARD_SORT_FIELDS,
  productOrderBy,
  PRODUCT_SORT_FIELDS,
} from "./filters";
import { ProductQuerySchema } from "../products/products.dto";
import { CardQuerySchema } from "../cards/cards.dto";

describe("filters (§87)", () => {
  it("product schema validates composable filters and rejects bad input", () => {
    const ok = ProductQuerySchema.parse({
      category: "Graded Cards",
      productType: "GRADED_CARD",
      minPrice: 10,
      maxPrice: 100,
      availability: "in_stock",
      sort: "price_asc",
    });
    expect(ok.minPrice).toBe(10);
    expect(ok.maxPrice).toBe(100);
    expect(ok.availability).toBe("in_stock");

    // invalid availability / sort → rejected
    expect(() => ProductQuerySchema.parse({ availability: "maybe" })).toThrow();
    expect(() => ProductQuerySchema.parse({ sort: "DROP TABLE" })).toThrow();
    expect(() => ProductQuerySchema.parse({ sort: "name DESC;" })).toThrow();
    // minPrice > maxPrice → rejected by the refine
    expect(() => ProductQuerySchema.parse({ minPrice: 100, maxPrice: 10 })).toThrow();
  });

  it("card schema validates grade/price/availability/sort", () => {
    const ok = CardQuerySchema.parse({
      rarity: "Rare",
      type: "Fire",
      grade: "PSA_10",
      minPrice: 5,
      sort: "number_asc",
    });
    expect(ok.grade).toBe("PSA_10");
    expect(ok.sort).toBe("number_asc");
    // grade is a free-form filter (max 20 chars, validated) — over-long input rejected
    expect(() => CardQuerySchema.parse({ grade: "X".repeat(21) })).toThrow();
    expect(() => CardQuerySchema.parse({ sort: "marketPrice;--" })).toThrow();
  });

  it("whitelists sortable fields — arbitrary keys cannot reach orderBy", () => {
    // The orderBy map only handles known keys; unknown input is never passed in.
    expect(PRODUCT_SORT_FIELDS).toEqual(["newest", "name_asc", "price_asc", "price_desc"]);
    expect(CARD_SORT_FIELDS).toEqual(["newest", "name_asc", "number_asc", "price_asc", "price_desc"]);
    expect(productOrderBy("price_asc")).toEqual({ price: "asc" });
    expect(productOrderBy("newest")).toEqual({ createdAt: "desc" });
    expect(cardOrderBy("number_asc")).toEqual({ cardNumber: "asc" });
    expect(cardOrderBy(undefined)).toEqual({ id: "asc" }); // stable cursor-safe default
  });

  it("no arbitrary SQL interpolation — sort keys are enum-constrained at the schema", () => {
    // z.enum means a malicious value never survives validation, so a raw value
    // cannot be interpolated into Prisma/SQL by any downstream caller.
    const parsed = ProductQuerySchema.safeParse({ sort: "price_asc; SELECT 1" });
    expect(parsed.success).toBe(false);
    const parsed2 = ProductQuerySchema.safeParse({ sort: "price_asc" });
    expect(parsed2.success).toBe(true);
    if (parsed2.success) expect(parsed2.data.sort).toBe("price_asc");
  });
});
