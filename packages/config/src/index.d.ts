/**
 * Type declarations for @pokemon-vault/config (plain-JS implementation).
 * Centralized validated configuration (G54): config/app.toml is the single
 * source of truth for non-secret tunables; POKE_VAULT_* env vars override toml
 * values; secrets are env-only. See index.js for behavior.
 */

export type NodeEnv = "development" | "test" | "staging" | "production";

export type FeatureFlagName = "PACK_OPENING" | "REWARDS" | "NEW_CHECKOUT";

export type DatabaseSslMode = "disable" | "require" | "verify-full";
export type ObjectStorageKind = "memory" | "minio" | "s3";
export type PaymentProviderKind = "test" | "stripe";
export type SecretProviderKind = "env" | "aws" | "doppler";

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

export interface PricingConfig {
  taxRatePercent: number;
  flatShippingUsd: number;
  freeShippingThresholdUsd: number;
  discountRatePercent: number;
}

export interface AppConfig {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  /** API HTTP port ([server] port / POKE_VAULT_API_PORT). */
  port: number;
  /** Storefront port for the dev environment (POKE_VAULT_WEB_PORT). */
  webPort: number;
  /** CORS / cookie origin allow-list ([app] webOrigin / POKE_VAULT_WEB_ORIGIN). */
  webOrigin: string[];
  /** Secrets — env-only (POKE_VAULT_*); required in production. */
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  apiDocsToken: string;
  database: {
    sslMode: DatabaseSslMode;
    sslCa: string;
  };
  auth: {
    accessTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
    verifyEmailTtlSeconds: number;
    passwordResetTtlSeconds: number;
  };
  security: {
    loginRateLimit: number;
    loginRateWindowSeconds: number;
  };
  featureFlags: FeatureFlags;
  cron: CronSchedules;
  retention: RetentionConfig;
  pricing: PricingConfig;
  media: {
    objectStorage: ObjectStorageKind;
    s3Endpoint: string;
    s3Bucket: string;
    s3AccessKey: string;
    s3SecretKey: string;
  };
  payments: {
    provider: PaymentProviderKind;
    stripeSecretKey: string;
    stripeWebhookSecret: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    apiKey: string;
    from: string;
  };
  secrets: {
    provider: SecretProviderKind;
    awsArn: string;
    awsRegion: string;
    dopplerToken: string;
    dopplerProject: string;
    dopplerConfig: string;
  };
  observability: {
    sentryDsn: string;
    sentryRelease: string;
    otelEndpoint: string;
    prometheusPort: number;
  };
}

/** Thrown by loadConfig when configuration is missing/invalid (fail-fast). */
export declare class ConfigValidationError extends Error {
  problems: string[];
}

/** The supported feature-flag names (FEATURE_<NAME>_ENABLED env vars). */
export declare const FEATURE_FLAG_NAMES: readonly FeatureFlagName[];

/** POKE_VAULT_* env var -> [toml section, toml key] override map. */
export declare const ENV_OVERRIDES: Record<string, [string, string]>;

/** POKE_VAULT_* env-only secret vars -> output key. */
export declare const SECRET_ENV: Record<string, string>;

/** Validate a 5-field cron expression (minute hour day-of-month month day-of-week). */
export declare function isValidCron5(pattern: string): boolean;

/**
 * Does a 5-field cron expression match the given date (default: now)?
 * Standard cron semantics (dom/dow OR when both restricted; 0/7 = Sunday).
 */
export declare function matchesCron(pattern: string, date?: Date): boolean;

/**
 * Load and validate configuration. Reads config/app.toml (POKE_VAULT_CONFIG_PATH
 * or walked up from cwd), applies POKE_VAULT_* env overrides, resolves secrets
 * from env, and fails fast (ConfigValidationError listing NAMES only) on invalid
 * values everywhere and on missing required secrets in production.
 */
export declare function loadConfig(
  env?: Record<string, string | undefined>,
): AppConfig;
