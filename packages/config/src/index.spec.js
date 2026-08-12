"use strict";
/**
 * Config package tests (§106-108) — plain node:test, no dependencies.
 * Covers: fail-fast validation (missing required vars, prod secret rules),
 * feature flags, cron schedule defaults/overrides, cron validation, and the
 * cron matcher used by the worker scheduler.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  loadConfig,
  ConfigValidationError,
  isValidCron5,
  matchesCron,
  CRON_DEFAULTS,
  FEATURE_FLAG_NAMES,
} = require("./index.js");

const FULL_ENV = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "0123456789abcdef0123456789abcdef",
  JWT_REFRESH_SECRET: "0123456789abcdef0123456789abcdef",
  WEB_ORIGIN: "http://localhost:3000",
  API_PORT: "3001",
};

test("loadConfig parses a complete environment with defaults", () => {
  const cfg = loadConfig(FULL_ENV);
  assert.equal(cfg.nodeEnv, "development");
  assert.equal(cfg.isProduction, false);
  assert.equal(cfg.port, 3001);
  assert.equal(cfg.databaseUrl, FULL_ENV.DATABASE_URL);
  assert.deepEqual(cfg.webOrigin, ["http://localhost:3000"]);
  // Feature flags default ENABLED (safe default).
  assert.equal(cfg.featureFlags.packOpeningEnabled, true);
  assert.equal(cfg.featureFlags.rewardsEnabled, true);
  assert.equal(cfg.featureFlags.newCheckoutEnabled, true);
  // Cron defaults are present and valid.
  for (const schedule of Object.values(cfg.cron)) {
    assert.equal(isValidCron5(schedule), true);
  }
  assert.equal(cfg.cron.releaseReservations, CRON_DEFAULTS.releaseReservations.default);
});

test("fail-fast: missing required vars are listed by NAME (never value)", () => {
  assert.throws(
    () => loadConfig({ ...FULL_ENV, DATABASE_URL: "", REDIS_URL: undefined }),
    (err) => {
      assert.ok(err instanceof ConfigValidationError);
      assert.equal(err.problems.length, 2);
      assert.ok(err.problems[0].includes("DATABASE_URL"));
      assert.ok(err.problems[1].includes("REDIS_URL"));
      assert.ok(!err.problems[0].includes(FULL_ENV.DATABASE_URL));
      return true;
    },
  );
});

test("fail-fast: production requires real JWT secrets (no placeholder)", () => {
  assert.throws(
    () => loadConfig({ ...FULL_ENV, NODE_ENV: "production", JWT_SECRET: "change-me" }),
    (err) => {
      assert.ok(err instanceof ConfigValidationError);
      assert.ok(err.problems.some((p) => p.includes("JWT_SECRET")));
      return true;
    },
  );
  const ok = loadConfig({ ...FULL_ENV, NODE_ENV: "production" });
  assert.equal(ok.isProduction, true);
});

test("feature flags parse boolean env values", () => {
  const cfg = loadConfig({
    ...FULL_ENV,
    FEATURE_PACK_OPENING_ENABLED: "false",
    FEATURE_REWARDS_ENABLED: "0",
    FEATURE_NEW_CHECKOUT_ENABLED: "true",
  });
  assert.equal(cfg.featureFlags.packOpeningEnabled, false);
  assert.equal(cfg.featureFlags.rewardsEnabled, false);
  assert.equal(cfg.featureFlags.newCheckoutEnabled, true);
  assert.deepEqual(FEATURE_FLAG_NAMES, ["PACK_OPENING", "REWARDS", "NEW_CHECKOUT"]);
});

test("invalid boolean and cron env values fail fast", () => {
  assert.throws(
    () => loadConfig({ ...FULL_ENV, FEATURE_REWARDS_ENABLED: "maybe" }),
    (err) => {
      assert.ok(err instanceof ConfigValidationError);
      assert.ok(err.problems.some((p) => p.includes("FEATURE_REWARDS_ENABLED")));
      return true;
    },
  );
  assert.throws(
    () => loadConfig({ ...FULL_ENV, CRON_DB_MAINTENANCE: "not a cron" }),
    (err) => {
      assert.ok(err instanceof ConfigValidationError);
      assert.ok(err.problems.some((p) => p.includes("CRON_DB_MAINTENANCE")));
      return true;
    },
  );
});

test("cron env overrides are honored", () => {
  const cfg = loadConfig({ ...FULL_ENV, CRON_RELEASE_RESERVATIONS: "*/5 * * * *" });
  assert.equal(cfg.cron.releaseReservations, "*/5 * * * *");
});

test("isValidCron5 accepts standard forms and rejects malformed ones", () => {
  for (const good of ["* * * * *", "*/5 * * * *", "0 3 * * 1-5", "15,45 2 * * *", "0 0 1 * *"]) {
    assert.equal(isValidCron5(good), true, good);
  }
  for (const bad of ["* * * *", "* * * * * *", "a b c d e", "60 * * * *", "*/0 * * * *"]) {
    assert.equal(isValidCron5(bad), false, bad);
  }
});

test("matchesCron: minute-level matching", () => {
  const d = new Date(2026, 7, 12, 3, 45, 0); // 2026-08-12 03:45
  assert.equal(matchesCron("45 3 * * *", d), true);
  assert.equal(matchesCron("46 3 * * *", d), false);
  assert.equal(matchesCron("*/15 * * * *", d), true); // 45 % 15 === 0
  assert.equal(matchesCron("0 3 * * *", d), false);
});

test("matchesCron: dom/dow OR semantics when both restricted", () => {
  const sunday = new Date(2026, 7, 9, 12, 0, 0); // 2026-08-09 is a Sunday
  const tue = new Date(2026, 7, 11, 12, 0, 0); // 2026-08-11 is a Tuesday
  // 1st of month OR Sunday.
  assert.equal(matchesCron("0 12 1 * 0", sunday), true); // Sunday match
  const first = new Date(2026, 7, 1, 12, 0, 0); // Saturday 2026-08-01
  assert.equal(matchesCron("0 12 1 * 0", first), true); // dom match
  assert.equal(matchesCron("0 12 1 * 0", tue), false);
});

test("matchesCron: weekday-only schedules ignore dom", () => {
  const monday = new Date(2026, 7, 10, 12, 0, 0); // Monday
  const saturday = new Date(2026, 7, 15, 12, 0, 0); // Saturday
  assert.equal(matchesCron("0 12 * * 1-5", monday), true);
  assert.equal(matchesCron("0 12 * * 1-5", saturday), false);
});
