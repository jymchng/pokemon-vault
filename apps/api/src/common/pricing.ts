/**
 * G17 §27 — server-side price calculation.
 *
 * All pricing is computed here from server data (product prices, server-side
 * rates). The client can NEVER supply authoritative subtotal/discount/shipping/
 * tax/total. Fiat USD is the default; the model is currency-agnostic.
 * No crypto/tokens anywhere.
 */

export interface PriceLine {
  unitPrice: number;
  quantity: number;
}

export interface PriceBreakdown {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
}

export interface PricingConfig {
  /** e.g. 10 = 10% */
  taxRatePercent: number;
  /** Flat shipping in USD (0 disables shipping). */
  flatShippingUsd: number;
  /** Orders at/above this after-discount subtotal ship free (0 disables). */
  freeShippingThresholdUsd: number;
  /** Promo discount percent applied to subtotal (0 disables). */
  discountRatePercent: number;
}

const envNum = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export function loadPricingConfig(): PricingConfig {
  return {
    taxRatePercent: envNum("TAX_RATE_PERCENT", 0),
    flatShippingUsd: envNum("FLAT_SHIPPING_USD", 0),
    freeShippingThresholdUsd: envNum("FREE_SHIPPING_THRESHOLD_USD", 0),
    discountRatePercent: envNum("DISCOUNT_RATE_PERCENT", 0),
  };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function computePrices(
  lines: PriceLine[],
  currency = "USD",
  cfg: PricingConfig = loadPricingConfig(),
): PriceBreakdown {
  const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const discount = round2((subtotal * cfg.discountRatePercent) / 100);
  const afterDiscount = round2(subtotal - discount);
  const free =
    cfg.freeShippingThresholdUsd > 0 && afterDiscount >= cfg.freeShippingThresholdUsd;
  const shipping = free ? 0 : cfg.flatShippingUsd;
  const tax = round2((afterDiscount * cfg.taxRatePercent) / 100);
  const total = round2(afterDiscount + shipping + tax);
  return { subtotal, discount, shipping, tax, total, currency };
}
