"use strict";
/**
 * Centralized validated configuration (G54).
 *
 * Single source of truth for ALL non-secret tunables lives in `config/app.toml`
 * (repo root): ports, TTLs, rates, URLs, limits, feature flags, pricing rates,
 * providers, cron schedules and retention. Every toml key can be overridden at
 * runtime by its POKE_VAULT_* environment variable (see ENV_OVERRIDES below).
 *
 * Secrets (DB URL, Redis URL, JWT secrets, Stripe/S3/SMTP keys, Sentry/OTLP,
 * API-docs token, Doppler token, DATABASE_SSL_CA) are NEVER stored in the toml;
 * they are read from POKE_VAULT_* environment variables only.
 *
 * Fail-fast validation: invalid toml values / invalid env overrides abort
 * startup in every environment; missing REQUIRED secrets abort startup in
 * production (variable NAMES only \u2014 never values). Local dev falls back to
 * documented development defaults so the stack boots without secrets.
 *
 * Implemented as plain CommonJS + a hand-written .d.ts (no build step) so it
 * can be consumed by the compiled API/worker and by `pnpm deploy` pruned
 * images exactly like the generated Prisma client.
 */

const fs = require("node:fs");
const path = require("node:path");
const TOML = require("@iarna/toml");

const BOOL_TRUE = new Set(["true", "1", "yes", "on"]);
const BOOL_FALSE = new Set(["false", "0", "no", "off"]);

const NODE_ENVS = ["development", "test", "staging", "production"];
const SSL_MODES = ["disable", "require", "verify-full"];
const OBJECT_STORAGES = ["memory", "minio", "s3"];
const PAYMENT_PROVIDERS = ["test", "stripe"];
const SECRET_PROVIDERS = ["env", "aws", "doppler"];

/** Dev-only fallback JWT secret (>= 32 chars, never "change-me"). */
const DEV_JWT_SECRET = "dev-only-insecure-secret-0123456789abcdef0123456789abcdef";

/** Feature flags (\u00a7107). Every flag defaults to ENABLED (safe default). */
const FEATURE_FLAG_NAMES = ["PACK_OPENING", "REWARDS", "NEW_CHECKOUT"];

/** Cron schedules (\u00a7106) \u2014 defaults live in config/app.toml [cron]. */

class ConfigValidationError extends Error {
  constructor(problems) {
    super(`Invalid configuration (${problems.length} problem(s)):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "ConfigValidationError";
    this.problems = problems;
  }
}

/**
 * ENV_OVERRIDES: POKE_VAULT_* env var -> [toml section, toml key].
 * These override the values declared in config/app.toml at runtime.
 */
const ENV_OVERRIDES = {
  POKE_VAULT_API_PORT: ["server", "port", "int"],
  POKE_VAULT_WEB_PORT: ["server", "webPort", "int"],
  POKE_VAULT_SHUTDOWN_TIMEOUT_MS: ["server", "shutdownTimeoutMs", "int"],
  POKE_VAULT_WEB_ORIGIN: ["app", "webOrigin", "stringArray"],
  POKE_VAULT_ACCESS_TOKEN_TTL_SECONDS: ["auth", "accessTokenTtlSeconds", "int"],
  POKE_VAULT_REFRESH_TOKEN_TTL_SECONDS: ["auth", "refreshTokenTtlSeconds", "int"],
  POKE_VAULT_VERIFY_EMAIL_TTL_SECONDS: ["auth", "verifyEmailTtlSeconds", "int"],
  POKE_VAULT_PASSWORD_RESET_TTL_SECONDS: ["auth", "passwordResetTtlSeconds", "int"],
  POKE_VAULT_PASSWORD_POLICY_MIN_LENGTH: ["passwordPolicy", "minLength", "int"],
  POKE_VAULT_PASSWORD_POLICY_MAX_LENGTH: ["passwordPolicy", "maxLength", "int"],
  POKE_VAULT_PASSWORD_POLICY_MIN_CHARACTER_CLASSES: ["passwordPolicy", "minCharacterClasses", "int"],
  POKE_VAULT_PASSWORD_POLICY_MIN_ENTROPY_BITS: ["passwordPolicy", "minEntropyBits", "int"],
  POKE_VAULT_LOGIN_RATE_LIMIT: ["security", "loginRateLimit", "int"],
  POKE_VAULT_LOGIN_RATE_WINDOW_SECONDS: ["security", "loginRateWindowSeconds", "int"],
  POKE_VAULT_GLOBAL_RATE_LIMIT: ["security", "globalRateLimit", "int"],
  POKE_VAULT_GLOBAL_RATE_TTL_MS: ["security", "globalRateTtlMs", "int"],
  POKE_VAULT_DATABASE_SSLMODE: ["database", "sslMode", "string"],
  POKE_VAULT_TAX_RATE_PERCENT: ["pricing", "taxRatePercent", "float"],
  POKE_VAULT_FLAT_SHIPPING_USD: ["pricing", "flatShippingUsd", "float"],
  POKE_VAULT_FREE_SHIPPING_THRESHOLD_USD: ["pricing", "freeShippingThresholdUsd", "float"],
  POKE_VAULT_DISCOUNT_RATE_PERCENT: ["pricing", "discountRatePercent", "float"],
  POKE_VAULT_FEATURE_PACK_OPENING_ENABLED: ["featureFlags", "packOpeningEnabled", "bool"],
  POKE_VAULT_FEATURE_REWARDS_ENABLED: ["featureFlags", "rewardsEnabled", "bool"],
  POKE_VAULT_FEATURE_NEW_CHECKOUT_ENABLED: ["featureFlags", "newCheckoutEnabled", "bool"],
  POKE_VAULT_CRON_RELEASE_RESERVATIONS: ["cron", "releaseReservations", "string"],
  POKE_VAULT_CRON_PURGE_ABANDONED_CARTS: ["cron", "purgeAbandonedCarts", "string"],
  POKE_VAULT_CRON_EXPIRE_REWARDS: ["cron", "expireRewards", "string"],
  POKE_VAULT_CRON_PURGE_STALE_SESSIONS: ["cron", "purgeStaleSessions", "string"],
  POKE_VAULT_CRON_PURGE_EMAIL_LOGS: ["cron", "purgeEmailLogs", "string"],
  POKE_VAULT_CRON_AGGREGATE_ANALYTICS: ["cron", "aggregateAnalytics", "string"],
  POKE_VAULT_CRON_DB_MAINTENANCE: ["cron", "dbMaintenance", "string"],
  POKE_VAULT_CART_TTL_DAYS: ["retention", "cartTtlDays", "int"],
  POKE_VAULT_EMAIL_LOG_TTL_DAYS: ["retention", "emailLogTtlDays", "int"],
  POKE_VAULT_NOTIFICATION_RETENTION_DAYS: ["retention", "notificationRetentionDays", "int"],
  POKE_VAULT_OBJECT_STORAGE: ["media", "objectStorage", "string"],
  POKE_VAULT_S3_ENDPOINT: ["media", "s3Endpoint", "string"],
  POKE_VAULT_S3_BUCKET: ["media", "s3Bucket", "string"],
  POKE_VAULT_PAYMENT_PROVIDER: ["payments", "provider", "string"],
  POKE_VAULT_SMTP_HOST: ["email", "smtpHost", "string"],
  POKE_VAULT_SMTP_PORT: ["email", "smtpPort", "int"],
  POKE_VAULT_EMAIL_FROM: ["email", "from", "string"],
  POKE_VAULT_SECRETS_PROVIDER: ["secrets", "provider", "string"],
  POKE_VAULT_AWS_REGION: ["secrets", "awsRegion", "string"],
  POKE_VAULT_DOPPLER_PROJECT: ["secrets", "dopplerProject", "string"],
  POKE_VAULT_DOPPLER_CONFIG: ["secrets", "dopplerConfig", "string"],
  POKE_VAULT_PROMETHEUS_PORT: ["observability", "prometheusPort", "int"],
};

/**
 * SECRET_ENV: POKE_VAULT_* env-only secrets -> output key.
 * Never read from toml. Required (fail-fast) in production.
 */
const SECRET_ENV = {
  POKE_VAULT_DATABASE_URL: "databaseUrl",
  POKE_VAULT_REDIS_URL: "redisUrl",
  POKE_VAULT_JWT_SECRET: "jwtSecret",
  POKE_VAULT_JWT_REFRESH_SECRET: "jwtRefreshSecret",
  POKE_VAULT_DATABASE_SSL_CA: "databaseSslCa",
  POKE_VAULT_S3_ACCESS_KEY: "s3AccessKey",
  POKE_VAULT_S3_SECRET_KEY: "s3SecretKey",
  POKE_VAULT_STRIPE_SECRET_KEY: "stripeSecretKey",
  POKE_VAULT_STRIPE_WEBHOOK_SECRET: "stripeWebhookSecret",
  POKE_VAULT_EMAIL_API_KEY: "emailApiKey",
  POKE_VAULT_API_DOCS_TOKEN: "apiDocsToken",
  POKE_VAULT_SECRETS_ARN: "secretsArn",
  POKE_VAULT_DOPPLER_TOKEN: "dopplerToken",
  POKE_VAULT_SENTRY_DSN: "sentryDsn",
  POKE_VAULT_SENTRY_RELEASE: "sentryRelease",
  POKE_VAULT_OTEL_EXPORTER_OTLP_ENDPOINT: "otelEndpoint",
};

/** Dev/test fallbacks for optional secrets (never used in production). */
const DEV_FALLBACKS = {
  databaseUrl: "postgresql://pokemon:pokemon@localhost:5432/pokemon_vault?schema=public",
  redisUrl: "redis://localhost:6379",
  jwtSecret: DEV_JWT_SECRET,
  jwtRefreshSecret: DEV_JWT_SECRET,
  databaseSslCa: "",
  s3AccessKey: "minioadmin",
  s3SecretKey: "minioadmin",
  stripeSecretKey: "",
  stripeWebhookSecret: "",
  emailApiKey: "",
  apiDocsToken: "",
  secretsArn: "",
  dopplerToken: "",
  sentryDsn: "",
  sentryRelease: "",
  otelEndpoint: "",
};

// ---------------------------------------------------------------------------
// TOML loading
// ---------------------------------------------------------------------------

const tomlCache = new Map();

/** Find config/app.toml: POKE_VAULT_CONFIG_PATH, else walk up from cwd. */
function resolveTomlPath(env) {
  const explicit = (env.POKE_VAULT_CONFIG_PATH || "").trim();
  if (explicit) {
    if (!fs.existsSync(explicit)) {
      throw new ConfigValidationError([
        `POKE_VAULT_CONFIG_PATH points to a missing file: ${explicit}`,
      ]);
    }
    return explicit;
  }
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    const candidate = path.join(dir, "config", "app.toml");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new ConfigValidationError([
    "config/app.toml not found (looked up from cwd). Run from the repo root or set POKE_VAULT_CONFIG_PATH.",
  ]);
}

/** Parse + cache the toml document (parse errors fail fast). */
function loadToml(env) {
  const p = resolveTomlPath(env);
  if (tomlCache.has(p)) return tomlCache.get(p);
  let doc;
  try {
    doc = TOML.parse(fs.readFileSync(p, "utf8"));
  } catch (err) {
    throw new ConfigValidationError([`Failed to parse ${p}: ${err.message}`]);
  }
  tomlCache.set(p, doc);
  return doc;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function push(problems, msg) {
  problems.push(msg);
}

function requireSection(doc, section, problems) {
  const s = doc[section];
  if (!s || typeof s !== "object") {
    push(problems, `config/app.toml is missing the [${section}] section`);
    return {};
  }
  return s;
}

function needString(doc, section, key, problems) {
  const s = requireSection(doc, section, problems);
  const v = s[key];
  if (typeof v !== "string" || v.trim().length === 0) {
    push(problems, `config/app.toml [${section}] ${key} must be a non-empty string`);
    return "";
  }
  return v;
}

function needNumber(doc, section, key, problems, { min = 0, int = false } = {}) {
  const s = requireSection(doc, section, problems);
  const v = s[key];
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || (int && !Number.isInteger(v))) {
    push(problems, `config/app.toml [${section}] ${key} must be a number >= ${min}${int ? " (integer)" : ""}`);
    return 0;
  }
  return v;
}

function needBoolean(doc, section, key, problems) {
  const s = requireSection(doc, section, problems);
  const v = s[key];
  if (typeof v !== "boolean") {
    push(problems, `config/app.toml [${section}] ${key} must be a boolean`);
    return false;
  }
  return v;
}

function needEnum(doc, section, key, allowed, problems) {
  const s = requireSection(doc, section, problems);
  const v = s[key];
  if (typeof v !== "string" || !allowed.includes(v)) {
    push(problems, `config/app.toml [${section}] ${key} must be one of: ${allowed.join(", ")}`);
    return allowed[0];
  }
  return v;
}

function needStringArray(doc, section, key, problems) {
  const s = requireSection(doc, section, problems);
  const v = s[key];
  if (!Array.isArray(v) || v.length === 0 || v.some((x) => typeof x !== "string" || !x.trim())) {
    push(problems, `config/app.toml [${section}] ${key} must be a non-empty array of strings`);
    return [];
  }
  return v.map((x) => x.trim());
}

/** Per-field allowed value ranges for 5-field cron (index: field position). */
const CRON_FIELD_BOUNDS = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 7],
];

function isValidCron5(pattern) {
  const fields = pattern.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const token = /^(\*|\d+|\d+-\d+)(\/\d+)?$/;
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (field === "*") continue;
    const [min, max] = CRON_FIELD_BOUNDS[i];
    const parts = field.split(",");
    if (parts.length === 0) return false;
    for (const part of parts) {
      if (!token.test(part)) return false;
      const step = part.includes("/") ? Number(part.split("/")[1]) : 1;
      if (step < 1) return false;
      const range = part.split("/")[0];
      let lo;
      let hi;
      if (range === "*") {
        lo = min;
        hi = max;
      } else if (range.includes("-")) {
        [lo, hi] = range.split("-").map(Number);
      } else {
        lo = hi = Number(range);
      }
      if (lo < min || hi > max || lo > hi) return false;
    }
  }
  return true;
}

function matchesCron(pattern, date) {
  const when = date || new Date();
  const fields = pattern.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const [minute, hour, dom, month, dowRaw] = fields;
  const fieldMatch = (field, value) => {
    if (field === "*") return true;
    return field.split(",").some((p) => {
      const [r, s] = p.split("/");
      const step = s ? Number(s) : 1;
      let start;
      let end;
      if (r === "*") {
        start = 0;
        end = 59;
      } else if (r.includes("-")) {
        const [a, b] = r.split("-").map(Number);
        start = a;
        end = b;
      } else {
        start = end = Number(r);
      }
      return value >= start && value <= end && (value - start) % step === 0;
    });
  };
  if (!fieldMatch(minute, when.getMinutes())) return false;
  if (!fieldMatch(hour, when.getHours())) return false;
  if (!fieldMatch(month, when.getMonth() + 1)) return false;
  const dow = dowRaw === "*" ? "*" : dowRaw.replace(/\b7\b/g, "0");
  const domRestricted = dom !== "*";
  const dowRestricted = dow !== "*";
  if (domRestricted && dowRestricted) {
    return fieldMatch(dom, when.getDate()) || fieldMatch(dow, when.getDay());
  }
  if (domRestricted) return fieldMatch(dom, when.getDate());
  if (dowRestricted) return fieldMatch(dow, when.getDay());
  return true;
}

// ---------------------------------------------------------------------------
// Env override + secret resolution
// ---------------------------------------------------------------------------

function parseBool(raw, problems, name) {
  const v = raw.trim().toLowerCase();
  if (BOOL_TRUE.has(v)) return true;
  if (BOOL_FALSE.has(v)) return false;
  push(problems, `Environment variable ${name} must be a boolean (true/false/1/0), got: ${raw}`);
  return false;
}

function parseNumber(raw, problems, name, { min = 0, int = true } = {}) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || (int && !Number.isInteger(n))) {
    push(problems, `Environment variable ${name} must be a number >= ${min}${int ? " (integer)" : ""}, got: ${raw}`);
    return 0;
  }
  return n;
}

/** Apply POKE_VAULT_* env overrides onto a CLONE of the toml doc. */
function applyEnvOverrides(doc, env, problems) {
  for (const [envName, [section, key, type]] of Object.entries(ENV_OVERRIDES)) {
    const raw = (env[envName] ?? "").trim();
    if (!raw) continue;
    if (!doc[section]) doc[section] = {};
    if (type === "stringArray") {
      doc[section][key] = raw
        .split(",")
        .map((s) => s.trim().replace(/\/+$/, ""))
        .filter(Boolean);
      continue;
    }
    if (type === "bool") {
      doc[section][key] = parseBool(raw, problems, envName);
      continue;
    }
    if (type === "int") {
      doc[section][key] = parseNumber(raw, problems, envName, { min: 0, int: true });
      continue;
    }
    if (type === "float") {
      doc[section][key] = parseNumber(raw, problems, envName, { min: 0, int: false });
      continue;
    }
    doc[section][key] = raw; // string
  }
}

/** Optional string (empty allowed) from a toml section. */
function optionalString(doc, section, key, problems) {
  const s = requireSection(doc, section, problems);
  const v = s[key];
  if (typeof v !== "string") {
    push(problems, `config/app.toml [${section}] ${key} must be a string`);
    return "";
  }
  return v;
}

/**
 * Resolve secrets from env (POKE_VAULT_*). The four core secrets are REQUIRED
 * in production (fail-fast); every other secret is optional and defaults to ""
 * in production (or a documented dev default in dev/test/staging).
 */
const PROD_REQUIRED_SECRETS = new Set([
  "databaseUrl",
  "redisUrl",
  "jwtSecret",
  "jwtRefreshSecret",
]);

function resolveSecrets(env, isProduction, problems) {
  const out = {};
  for (const [envName, key] of Object.entries(SECRET_ENV)) {
    const raw = (env[envName] ?? "").trim();
    if (raw) {
      out[key] = raw;
      continue;
    }
    if (isProduction && PROD_REQUIRED_SECRETS.has(key)) {
      push(problems, `Missing required environment variable: ${envName}`);
      out[key] = "";
      continue;
    }
    out[key] = isProduction ? "" : (DEV_FALLBACKS[key] ?? "");
  }
  return out;
}

// ---------------------------------------------------------------------------
// loadConfig
// ---------------------------------------------------------------------------

const configCache = new WeakMap();

/**
 * Load and validate configuration. Throws ConfigValidationError (fail-fast)
 * listing every problem — variable/section NAMES only, never values. In
 * production, missing required secrets abort startup; in dev/test they fall
 * back to documented development defaults.
 */
function loadConfig(env) {
  const e = env || process.env;
  if (configCache.has(e)) return configCache.get(e);

  const problems = [];

  const nodeEnvRaw = (e.NODE_ENV ?? "development").trim().toLowerCase();
  const nodeEnv = NODE_ENVS.includes(nodeEnvRaw) ? nodeEnvRaw : "development";
  if (!NODE_ENVS.includes(nodeEnvRaw)) {
    push(problems, `NODE_ENV must be one of ${NODE_ENVS.join(", ")}; got: ${nodeEnvRaw}`);
  }
  const isProduction = nodeEnv === "production";

  const doc = JSON.parse(JSON.stringify(loadToml(e)));
  applyEnvOverrides(doc, e, problems);

  // --- validated non-secret config from toml (+ env overrides) ---
  const server = requireSection(doc, "server", problems);
  const appSec = requireSection(doc, "app", problems);
  const authSec = requireSection(doc, "auth", problems);
  const secSec = requireSection(doc, "security", problems);
  const dbSec = requireSection(doc, "database", problems);
  const pricingSec = requireSection(doc, "pricing", problems);
  const flagSec = requireSection(doc, "featureFlags", problems);
  const cronSec = requireSection(doc, "cron", problems);
  const retentionSec = requireSection(doc, "retention", problems);
  const mediaSec = requireSection(doc, "media", problems);
  const paySec = requireSection(doc, "payments", problems);
  const emailSec = requireSection(doc, "email", problems);
  const secretsSec = requireSection(doc, "secrets", problems);
  const obsSec = requireSection(doc, "observability", problems);

  const port = needNumber(doc, "server", "port", problems, { min: 1, int: true });
  const webPort = needNumber(doc, "server", "webPort", problems, { min: 1, int: true });
  const shutdownTimeoutMs = needNumber(doc, "server", "shutdownTimeoutMs", problems, { min: 1000, int: true });
  const webOrigin = needStringArray(doc, "app", "webOrigin", problems);

  const accessTokenTtlSeconds = needNumber(doc, "auth", "accessTokenTtlSeconds", problems, { min: 1, int: true });
  const refreshTokenTtlSeconds = needNumber(doc, "auth", "refreshTokenTtlSeconds", problems, { min: 1, int: true });
  const verifyEmailTtlSeconds = needNumber(doc, "auth", "verifyEmailTtlSeconds", problems, { min: 1, int: true });
  const passwordResetTtlSeconds = needNumber(doc, "auth", "passwordResetTtlSeconds", problems, { min: 1, int: true });

  const pwMinLength = needNumber(doc, "passwordPolicy", "minLength", problems, { min: 8, int: true });
  const pwMaxLength = needNumber(doc, "passwordPolicy", "maxLength", problems, { min: 8, int: true });
  const pwMinCharacterClasses = needNumber(doc, "passwordPolicy", "minCharacterClasses", problems, { min: 1, int: true });
  const pwMinEntropyBits = needNumber(doc, "passwordPolicy", "minEntropyBits", problems, { min: 1, int: true });

  const loginRateLimit = needNumber(doc, "security", "loginRateLimit", problems, { min: 1, int: true });
  const loginRateWindowSeconds = needNumber(doc, "security", "loginRateWindowSeconds", problems, { min: 1, int: true });
  const globalRateLimit = needNumber(doc, "security", "globalRateLimit", problems, { min: 1, int: true });
  const globalRateTtlMs = needNumber(doc, "security", "globalRateTtlMs", problems, { min: 1000, int: true });

  const sslMode = needEnum(doc, "database", "sslMode", SSL_MODES, problems);

  const taxRatePercent = needNumber(doc, "pricing", "taxRatePercent", problems, { min: 0 });
  const flatShippingUsd = needNumber(doc, "pricing", "flatShippingUsd", problems, { min: 0 });
  const freeShippingThresholdUsd = needNumber(doc, "pricing", "freeShippingThresholdUsd", problems, { min: 0 });
  const discountRatePercent = needNumber(doc, "pricing", "discountRatePercent", problems, { min: 0 });

  const featureFlags = {};
  for (const name of FEATURE_FLAG_NAMES) {
    const key = `${name.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}Enabled`;
    featureFlags[key] = needBoolean(doc, "featureFlags", key, problems);
  }

  const CRON_KEYS = [
    "releaseReservations",
    "purgeAbandonedCarts",
    "expireRewards",
    "purgeStaleSessions",
    "purgeEmailLogs",
    "aggregateAnalytics",
    "dbMaintenance",
  ];
  const cron = {};
  for (const key of CRON_KEYS) {
    const v = needString(doc, "cron", key, problems);
    if (v && !isValidCron5(v)) {
      push(problems, `config/app.toml [cron] ${key} is not a valid 5-field cron expression: ${v}`);
    }
    cron[key] = v || "* * * * *";
  }

  const cartTtlDays = needNumber(doc, "retention", "cartTtlDays", problems, { min: 1, int: true });
  const emailLogTtlDays = needNumber(doc, "retention", "emailLogTtlDays", problems, { min: 1, int: true });
  const notificationRetentionDays = needNumber(doc, "retention", "notificationRetentionDays", problems, { min: 1, int: true });

  const objectStorage = needEnum(doc, "media", "objectStorage", OBJECT_STORAGES, problems);
  const s3Endpoint = needString(doc, "media", "s3Endpoint", problems);
  const s3Bucket = needString(doc, "media", "s3Bucket", problems);

  const paymentProvider = needEnum(doc, "payments", "provider", PAYMENT_PROVIDERS, problems);

  const smtpHost = needString(doc, "email", "smtpHost", problems);
  const smtpPort = needNumber(doc, "email", "smtpPort", problems, { min: 1, int: true });
  const emailFrom = needString(doc, "email", "from", problems);

  const secretsProvider = needEnum(doc, "secrets", "provider", SECRET_PROVIDERS, problems);
  const awsRegion = optionalString(doc, "secrets", "awsRegion", problems);
  const dopplerProject = optionalString(doc, "secrets", "dopplerProject", problems);
  const dopplerConfig = optionalString(doc, "secrets", "dopplerConfig", problems);

  const prometheusPort = needNumber(doc, "observability", "prometheusPort", problems, { min: 1, int: true });

  // --- secrets (env-only) ---
  const secrets = resolveSecrets(e, isProduction, problems);
  if (isProduction) {
    if (secrets.jwtSecret === DEV_JWT_SECRET || secrets.jwtSecret.length < 32) {
      push(problems, "POKE_VAULT_JWT_SECRET must be a real secret (>= 32 chars) in production");
    }
    if (secrets.jwtRefreshSecret === DEV_JWT_SECRET || secrets.jwtRefreshSecret.length < 32) {
      push(problems, "POKE_VAULT_JWT_REFRESH_SECRET must be a real secret (>= 32 chars) in production");
    }
    if (webOrigin.length === 0) {
      push(problems, "Production requires [app] webOrigin (or POKE_VAULT_WEB_ORIGIN)");
    }
  }

  if (problems.length > 0) {
    throw new ConfigValidationError(problems);
  }

  const cfg = Object.freeze({
    nodeEnv,
    isProduction,
    port,
    webPort,
    shutdownTimeoutMs,
    webOrigin,
    databaseUrl: secrets.databaseUrl,
    redisUrl: secrets.redisUrl,
    jwtSecret: secrets.jwtSecret,
    jwtRefreshSecret: secrets.jwtRefreshSecret,
    apiDocsToken: secrets.apiDocsToken,
    database: Object.freeze({ sslMode, sslCa: secrets.databaseSslCa }),
    auth: Object.freeze({
      accessTokenTtlSeconds,
      refreshTokenTtlSeconds,
      verifyEmailTtlSeconds,
      passwordResetTtlSeconds,
    }),
    passwordPolicy: Object.freeze({
      minLength: pwMinLength,
      maxLength: pwMaxLength,
      minCharacterClasses: pwMinCharacterClasses,
      minEntropyBits: pwMinEntropyBits,
    }),
    security: Object.freeze({ loginRateLimit, loginRateWindowSeconds, globalRateLimit, globalRateTtlMs }),
    featureFlags: Object.freeze({ ...featureFlags }),
    cron: Object.freeze({ ...cron }),
    retention: Object.freeze({
      cartTtlDays,
      emailLogTtlDays,
      notificationRetentionDays,
    }),
    pricing: Object.freeze({
      taxRatePercent,
      flatShippingUsd,
      freeShippingThresholdUsd,
      discountRatePercent,
    }),
    media: Object.freeze({
      objectStorage,
      s3Endpoint,
      s3Bucket,
      s3AccessKey: secrets.s3AccessKey,
      s3SecretKey: secrets.s3SecretKey,
    }),
    payments: Object.freeze({
      provider: paymentProvider,
      stripeSecretKey: secrets.stripeSecretKey,
      stripeWebhookSecret: secrets.stripeWebhookSecret,
    }),
    email: Object.freeze({
      smtpHost,
      smtpPort,
      apiKey: secrets.emailApiKey,
      from: emailFrom,
    }),
    secrets: Object.freeze({
      provider: secretsProvider,
      awsArn: secrets.secretsArn,
      awsRegion,
      dopplerToken: secrets.dopplerToken,
      dopplerProject,
      dopplerConfig,
    }),
    observability: Object.freeze({
      sentryDsn: secrets.sentryDsn,
      sentryRelease: secrets.sentryRelease,
      otelEndpoint: secrets.otelEndpoint,
      prometheusPort,
    }),
  });

  configCache.set(e, cfg);
  return cfg;
}

module.exports = {
  loadConfig,
  ConfigValidationError,
  isValidCron5,
  matchesCron,
  FEATURE_FLAG_NAMES,
  ENV_OVERRIDES,
  SECRET_ENV,
};
