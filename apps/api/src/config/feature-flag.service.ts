import { Inject, Injectable } from "@nestjs/common";
import { AppConfig, FeatureFlags } from "@pokemon-vault/config";
import { APP_CONFIG } from "./config.constants";
import { FeatureDisabledError } from "../common/app-error";

/**
 * Feature flags (§107): runtime opt-out for high-risk or staged features
 * without a redeploy (FEATURE_*_ENABLED env, default ENABLED). Services call
 * assertEnabled() at the operation boundary so a disabled feature fails with
 * a stable FEATURE_DISABLED (403) error the frontend can render.
 *
 * Flags today:
 *   - PACK_OPENING_ENABLED   gate pack-opening (a paid randomization path)
 *   - REWARDS_ENABLED        gate XP/reward redemption (promo risk)
 *   - NEW_CHECKOUT_ENABLED   gate the checkout flow while it evolves
 */
@Injectable()
export class FeatureFlagService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  /** Snapshot of all flags (read-only). */
  get flags(): FeatureFlags {
    return this.config.featureFlags;
  }

  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.config.featureFlags[flag] === true;
  }

  /**
   * Throw FeatureDisabledError (403, code FEATURE_DISABLED) when the flag is
   * off. Message is stable and safe to surface (no internal details).
   */
  assertEnabled(flag: keyof FeatureFlags, message = "This feature is currently disabled") {
    if (!this.isEnabled(flag)) {
      throw new FeatureDisabledError(message);
    }
  }
}
