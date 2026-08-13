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

import { loadConfig } from "@pokemon-vault/config";

/**
 * Pricing rates (G54) — sourced from the centralized config: values in
 * config/app.toml [pricing], overridable via POKE_VAULT_* env. Fall back to
 * documented dev defaults if config is unavailable (never fail at import).
 */
let _pricing: PricingConfig | null = null;
function effectivePricing(): PricingConfig {
  if (_pricing) return _pricing;
  let cfg: ReturnType<typeof loadConfig> | null = null;
  try {
    cfg = loadConfig(process.env);
  } catch {
    cfg = null;
  }
  _pricing = {
    taxRatePercent: cfg?.pricing.taxRatePercent ?? 0,
    flatShippingUsd: cfg?.pricing.flatShippingUsd ?? 0,
    freeShippingThresholdUsd: cfg?.pricing.freeShippingThresholdUsd ?? 0,
    discountRatePercent: cfg?.pricing.discountRatePercent ?? 0,
  };
  return _pricing;
}

export function loadPricingConfig(): PricingConfig {
  return { ...effectivePricing() };
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
