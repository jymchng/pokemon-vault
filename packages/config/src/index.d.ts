/**
 * Type declarations for @pokemon-vault/config (plain-JS implementation).
 * Centralized validated configuration (§108) — see index.js for behavior.
 */

export type NodeEnv = "development" | "test" | "staging" | "production";

export type FeatureFlagName = "PACK_OPENING" | "REWARDS" | "NEW_CHECKOUT";

export interface FeatureFlags {
  packOpeningEnabled: boolean;
  rewardsEnabled: boolean;
  newCheckoutEnabled: boolean;
}

export interface CronSchedules {
  releaseReservations: string;
  purgeAbandonedCarts: string;
  expireRewards: string;
  purgeStaleSessions: string;
  purgeEmailLogs: string;
  aggregateAnalytics: string;
  dbMaintenance: string;
}

export interface RetentionConfig {
  cartTtlDays: number;
  emailLogTtlDays: number;
  notificationRetentionDays: number;
}

export interface AppConfig {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  webOrigin: string[];
  jwtSecret: string;
  jwtRefreshSecret: string;
  featureFlags: FeatureFlags;
  cron: CronSchedules;
  retention: RetentionConfig;
}

/** Thrown by loadConfig when the environment is missing/invalid (fail-fast). */
export declare class ConfigValidationError extends Error {
  problems: string[];
}

/** Default cron expressions keyed by schedule name (CRON_* env override). */
export declare const CRON_DEFAULTS: Record<
  keyof CronSchedules,
  { env: string; default: string }
>;

/** The supported feature-flag names (FEATURE_<NAME>_ENABLED env vars). */
export declare const FEATURE_FLAG_NAMES: readonly FeatureFlagName[];

/** Validate a 5-field cron expression (minute hour day-of-month month day-of-week). */
export declare function isValidCron5(pattern: string): boolean;

/**
 * Does a 5-field cron expression match the given date (default: now)?
 * Standard cron semantics (dom/dow OR when both restricted; 0/7 = Sunday).
 */
export declare function matchesCron(pattern: string, date?: Date): boolean;

/**
 * Load and validate configuration from an environment map (defaults to
 * process.env). Fails fast: throws ConfigValidationError listing every
 * missing/invalid variable NAME — never the values.
 */
export declare function loadConfig(
  env?: Record<string, string | undefined>,
): AppConfig;
