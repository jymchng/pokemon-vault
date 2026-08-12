"use strict";
/**
 * Centralized validated configuration (§108).
 *
 * Single source of truth for runtime configuration across the API and the
 * worker: environment parsing, fail-fast validation (missing/invalid required
 * vars abort startup with the variable NAMES only — never values), feature
 * flags (§107), and cron schedules (§106).
 *
 * Implemented as plain CommonJS + a hand-written .d.ts (no build step) so it
 * can be consumed by the compiled API/worker and by `pnpm deploy` pruned
 * images exactly like the generated Prisma client — no tsconfig rootDir
 * gymnastics, no runtime TS loader, no extra Docker build stage.
 */

const BOOL_TRUE = new Set(["true", "1", "yes", "on"]);
const BOOL_FALSE = new Set(["false", "0", "no", "off"]);

/** Feature flags (§107). Every flag defaults to ENABLED (safe default). */
const FEATURE_FLAG_NAMES = ["PACK_OPENING", "REWARDS", "NEW_CHECKOUT"];

/** Cron schedules (§106) — overridable via CRON_* env; sensible defaults. */
const CRON_DEFAULTS = {
  releaseReservations: { env: "CRON_RELEASE_RESERVATIONS", default: "* * * * *" },
  purgeAbandonedCarts: { env: "CRON_PURGE_ABANDONED_CARTS", default: "0 3 * * *" },
  expireRewards: { env: "CRON_EXPIRE_REWARDS", default: "0 * * * *" },
  purgeStaleSessions: { env: "CRON_PURGE_STALE_SESSIONS", default: "0 * * * *" },
  purgeEmailLogs: { env: "CRON_PURGE_EMAIL_LOGS", default: "30 3 * * *" },
  aggregateAnalytics: { env: "CRON_AGGREGATE_ANALYTICS", default: "15 2 * * *" },
  dbMaintenance: { env: "CRON_DB_MAINTENANCE", default: "45 3 * * *" },
};

const NODE_ENVS = ["development", "test", "staging", "production"];

class ConfigValidationError extends Error {
  constructor(problems) {
    super(`Invalid configuration (${problems.length} problem(s)):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "ConfigValidationError";
    this.problems = problems;
  }
}

/** Required non-empty string; records the missing NAME (never the value). */
function requireString(problems, env, name) {
  const value = (env[name] ?? "").trim();
  if (!value) {
    problems.push(`Missing required environment variable: ${name}`);
    return "";
  }
  return value;
}

function optionalString(env, name, fallback) {
  const value = (env[name] ?? "").trim();
  return value ? value : fallback;
}

function boolFromEnv(problems, env, name, fallback) {
  const raw = (env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (BOOL_TRUE.has(raw)) return true;
  if (BOOL_FALSE.has(raw)) return false;
  problems.push(`Environment variable ${name} must be a boolean (true/false/1/0), got: ${raw}`);
  return fallback;
}

function intFromEnv(problems, env, name, fallback) {
  const raw = (env[name] ?? "").trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    problems.push(`Environment variable ${name} must be a positive integer, got: ${raw}`);
    return fallback;
  }
  return n;
}

/** Per-field allowed value ranges for 5-field cron (index: field position). */
const CRON_FIELD_BOUNDS = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day-of-month
  [1, 12], // month
  [0, 7], // day-of-week (0 and 7 = Sunday)
];

/**
 * Validate a 5-field cron expression (minute hour dom month dow).
 * Accepts *, numbers, ranges (a-b), steps (slash-n forms) and comma lists;
 * each field's values must fall within the field's allowed range.
 */
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

function cronFromEnv(problems, env, name, fallback) {
  const raw = (env[name] ?? "").trim();
  if (!raw) return fallback;
  if (!isValidCron5(raw)) {
    problems.push(`Environment variable ${name} is not a valid 5-field cron expression: ${raw}`);
    return fallback;
  }
  return raw;
}

/** Match a single cron field (numbers, ranges, steps, comma lists). */
function cronFieldMatches(field, value) {
  if (field === "*") return true;
  for (const part of field.split(",")) {
    const [rangePart, stepPart] = part.split("/");
    const step = stepPart ? Number(stepPart) : 1;
    let start;
    let end;
    if (rangePart === "*") {
      start = 0;
      end = 59;
    } else if (rangePart.includes("-")) {
      const [a, b] = rangePart.split("-").map(Number);
      start = a;
      end = b;
    } else {
      start = end = Number(rangePart);
    }
    if (value >= start && value <= end && (value - start) % step === 0) return true;
  }
  return false;
}

/**
 * Does a 5-field cron expression match the given date (default: now)?
 * Standard cron semantics: if BOTH day-of-month and day-of-week are
 * restricted, the date matches when EITHER matches; otherwise the restricted
 * field governs. Day-of-week 0 and 7 both mean Sunday.
 */
function matchesCron(pattern, date) {
  const when = date || new Date();
  const fields = pattern.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const [minute, hour, dom, month, dowRaw] = fields;
  if (!cronFieldMatches(minute, when.getMinutes())) return false;
  if (!cronFieldMatches(hour, when.getHours())) return false;
  if (!cronFieldMatches(month, when.getMonth() + 1)) return false;
  let dow = dowRaw;
  if (dow !== "*") {
    // Normalize 7 -> 0 so Sunday matches both representations.
    dow = dow
      .split(",")
      .map((p) => {
        if (p === "*") return p;
        return p.replace(/\b7\b/g, "0");
      })
      .join(",");
  }
  const domRestricted = dom !== "*";
  const dowRestricted = dow !== "*";
  if (domRestricted && dowRestricted) {
    return cronFieldMatches(dom, when.getDate()) || cronFieldMatches(dow, when.getDay());
  }
  if (domRestricted) return cronFieldMatches(dom, when.getDate());
  if (dowRestricted) return cronFieldMatches(dow, when.getDay());
  return true;
}

/**
 * Load and validate configuration. Throws ConfigValidationError (fail-fast)
 * listing every missing/invalid variable NAME when the environment is wrong —
 * including required production vars. Never returns partial config.
 */
function loadConfig(env) {
  const e = env || process.env;
  const problems = [];

  // Runtime.
  const nodeEnvRaw = (e.NODE_ENV ?? "development").trim().toLowerCase();
  const nodeEnv = NODE_ENVS.includes(nodeEnvRaw) ? nodeEnvRaw : "development";
  if (!NODE_ENVS.includes(nodeEnvRaw)) {
    problems.push(`NODE_ENV must be one of ${NODE_ENVS.join(", ")}; got: ${nodeEnvRaw}`);
  }
  const isProduction = nodeEnv === "production";

  // Always required.
  const databaseUrl = requireString(problems, e, "DATABASE_URL");
  const redisUrl = requireString(problems, e, "REDIS_URL");

  // Production-only hard requirements (fail fast so a misconfigured prod
  // deployment never boots with placeholder/missing credentials).
  const jwtSecret = requireString(problems, e, "JWT_SECRET");
  const jwtRefreshSecret = requireString(problems, e, "JWT_REFRESH_SECRET");
  const webOriginRaw = requireString(problems, e, "WEB_ORIGIN");
  if (isProduction) {
    if (jwtSecret === "change-me" || jwtSecret.length < 32) {
      problems.push("JWT_SECRET must be a real secret (>= 32 chars, not the dev placeholder 'change-me') in production");
    }
    if (jwtRefreshSecret === "change-me" || jwtRefreshSecret.length < 32) {
      problems.push("JWT_REFRESH_SECRET must be a real secret (>= 32 chars, not the dev placeholder 'change-me') in production");
    }
  }

  // Port.
  const port = intFromEnv(problems, e, "API_PORT", intFromEnv(problems, e, "PORT", 3001));

/** PACK_OPENING -> packOpening (camelCase for the config object). */
function camelCase(flagName) {
  return flagName
    .toLowerCase()
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

  // Feature flags (§107) — opt-out via env; default ENABLED.
  const featureFlags = {};
  for (const name of FEATURE_FLAG_NAMES) {
    featureFlags[`${camelCase(name)}Enabled`] = boolFromEnv(
      problems, e, `FEATURE_${name}_ENABLED`, true,
    );
  }

  // Cron schedules (§106) — overridable, validated.
  const cron = {};
  for (const [key, def] of Object.entries(CRON_DEFAULTS)) {
    cron[key] = cronFromEnv(problems, e, def.env, def.default);
  }

  // Retention / cleanup TTLs (days) — used by the cron jobs.
  const cartTtlDays = intFromEnv(problems, e, "CART_TTL_DAYS", 30);
  const emailLogTtlDays = intFromEnv(problems, e, "EMAIL_LOG_TTL_DAYS", 90);
  const notificationRetentionDays = intFromEnv(problems, e, "NOTIFICATION_RETENTION_DAYS", 730);

  if (problems.length > 0) {
    throw new ConfigValidationError(problems);
  }

  return Object.freeze({
    nodeEnv,
    isProduction,
    port,
    databaseUrl,
    redisUrl,
    webOrigin: webOriginRaw.split(",").map((s) => s.trim()).filter(Boolean),
    jwtSecret,
    jwtRefreshSecret,
    featureFlags,
    cron: Object.freeze({ ...cron }),
    retention: Object.freeze({
      cartTtlDays,
      emailLogTtlDays,
      notificationRetentionDays,
    }),
  });
}

module.exports = {
  loadConfig,
  ConfigValidationError,
  isValidCron5,
  matchesCron,
  FEATURE_FLAG_NAMES,
  CRON_DEFAULTS,
};
