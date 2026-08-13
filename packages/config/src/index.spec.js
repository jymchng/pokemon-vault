"use strict";
/**
 * Config package tests (G54): toml source of truth, POKE_VAULT_* env
 * overrides, fail-fast validation, and prod secret requirements.
 */
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");

const { loadConfig, ConfigValidationError, isValidCron5, matchesCron } = require("./index.js");

/** A minimal valid dev env (secrets fall back to dev defaults when absent). */
const DEV_ENV = {
  NODE_ENV: "development",
  POKE_VAULT_DATABASE_URL: "postgresql://u:p@localhost:5432/db?schema=public",
  POKE_VAULT_REDIS_URL: "redis://localhost:6379",
  POKE_VAULT_JWT_SECRET: "0123456789abcdef0123456789abcdef",
  POKE_VAULT_JWT_REFRESH_SECRET: "0123456789abcdef0123456789abcdef",
  POKE_VAULT_WEB_ORIGIN: "http://localhost:3000",
};

test("loadConfig reads non-secret defaults from config/app.toml", () => {
  const cfg = loadConfig({ NODE_ENV: "development" });
  assert.equal(cfg.nodeEnv, "development");
  assert.equal(cfg.port, 3001);
  assert.equal(cfg.webPort, 3000);
  assert.equal(cfg.shutdownTimeoutMs, 30000);
  assert.deepEqual(cfg.webOrigin, ["http://localhost:3000"]);
  assert.equal(cfg.featureFlags.packOpeningEnabled, true);
  assert.equal(cfg.cron.releaseReservations, "* * * * *");
  assert.equal(cfg.cron.dbMaintenance, "45 3 * * *");
  assert.equal(cfg.retention.cartTtlDays, 30);
  assert.equal(cfg.pricing.taxRatePercent, 0);
  assert.equal(cfg.media.objectStorage, "memory");
  assert.equal(cfg.payments.provider, "test");
  assert.equal(cfg.secrets.provider, "env");
  assert.equal(cfg.observability.prometheusPort, 9464);
  assert.equal(cfg.auth.accessTokenTtlSeconds, 900);
  assert.equal(cfg.passwordPolicy.minLength, 8);
  assert.equal(cfg.passwordPolicy.maxLength, 128);
  assert.equal(cfg.passwordPolicy.minCharacterClasses, 3);
  assert.equal(cfg.passwordPolicy.minEntropyBits, 24);
  assert.equal(cfg.security.loginRateLimit, 10);
  assert.equal(cfg.security.globalRateLimit, 60);
  assert.equal(cfg.security.globalRateTtlMs, 60000);
  // dev secrets fall back to dev defaults
  assert.match(cfg.databaseUrl, /localhost:5432/);
  assert.ok(cfg.jwtSecret.length >= 32);
});

test("POKE_VAULT_ env vars override toml values", () => {
  const cfg = loadConfig({
    NODE_ENV: "development",
    POKE_VAULT_API_PORT: "4001",
    POKE_VAULT_WEB_PORT: "4000",
    POKE_VAULT_WEB_ORIGIN: "https://vault.example.com,https://admin.example.com",
    POKE_VAULT_LOGIN_RATE_LIMIT: "3",
    POKE_VAULT_FEATURE_REWARDS_ENABLED: "false",
    POKE_VAULT_CRON_PURGE_ABANDONED_CARTS: "0 2 * * *",
    POKE_VAULT_TAX_RATE_PERCENT: "8.5",
    POKE_VAULT_PASSWORD_POLICY_MIN_LENGTH: "10",
    POKE_VAULT_PASSWORD_POLICY_MIN_ENTROPY_BITS: "30",
  });
  assert.equal(cfg.port, 4001);
  assert.equal(cfg.webPort, 4000);
  assert.deepEqual(cfg.webOrigin, [
    "https://vault.example.com",
    "https://admin.example.com",
  ]);
  assert.equal(cfg.security.loginRateLimit, 3);
  assert.equal(cfg.featureFlags.rewardsEnabled, false);
  assert.equal(cfg.cron.purgeAbandonedCarts, "0 2 * * *");
  assert.equal(cfg.pricing.taxRatePercent, 8.5);
  assert.equal(cfg.passwordPolicy.minLength, 10);
  assert.equal(cfg.passwordPolicy.minEntropyBits, 30);
});

test("fail-fast: invalid env override type throws", () => {
  assert.throws(
    () => loadConfig({ NODE_ENV: "development", POKE_VAULT_API_PORT: "abc" }),
    ConfigValidationError,
  );
  assert.throws(
    () => loadConfig({ NODE_ENV: "development", POKE_VAULT_FEATURE_REWARDS_ENABLED: "maybe" }),
    ConfigValidationError,
  );
  assert.throws(
    () => loadConfig({ NODE_ENV: "development", POKE_VAULT_DATABASE_SSLMODE: "nope" }),
    ConfigValidationError,
  );
  assert.throws(
    () => loadConfig({ NODE_ENV: "development", POKE_VAULT_CRON_PURGE_ABANDONED_CARTS: "not a cron" }),
    ConfigValidationError,
  );
});

test("fail-fast: production requires real secrets", () => {
  assert.throws(
    () => loadConfig({ NODE_ENV: "production" }),
    (err) => {
      assert.ok(err instanceof ConfigValidationError);
      const joined = err.problems.join("\n");
      assert.match(joined, /POKE_VAULT_DATABASE_URL/);
      assert.match(joined, /POKE_VAULT_REDIS_URL/);
      assert.match(joined, /POKE_VAULT_JWT_SECRET/);
      assert.match(joined, /POKE_VAULT_JWT_REFRESH_SECRET/);
      return true;
    },
  );
  // placeholder dev secret must be rejected in prod
  assert.throws(
    () =>
      loadConfig({
        NODE_ENV: "production",
        POKE_VAULT_DATABASE_URL: "postgresql://u:p@db:5432/db",
        POKE_VAULT_REDIS_URL: "rediss://redis:6379",
        POKE_VAULT_JWT_SECRET: "change-me",
        POKE_VAULT_JWT_REFRESH_SECRET: "change-me",
        POKE_VAULT_WEB_ORIGIN: "https://vault.example.com",
      }),
    /JWT_SECRET/,
  );
});

test("production passes with real secrets", () => {
  const cfg = loadConfig({
    NODE_ENV: "production",
    POKE_VAULT_DATABASE_URL: "postgresql://u:p@db:5432/db?schema=public",
    POKE_VAULT_REDIS_URL: "rediss://redis:6379",
    POKE_VAULT_JWT_SECRET: "0123456789abcdef0123456789abcdef",
    POKE_VAULT_JWT_REFRESH_SECRET: "0123456789abcdef0123456789abcdef",
    POKE_VAULT_WEB_ORIGIN: "https://vault.example.com",
  });
  assert.equal(cfg.isProduction, true);
  assert.equal(cfg.databaseUrl, "postgresql://u:p@db:5432/db?schema=public");
});

test("POKE_VAULT_CONFIG_PATH points at an alternate toml", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pvcfg-"));
  const alt = path.join(dir, "app.toml");
  // Full copy of the repo config with a port override (validation is strict:
  // every section must exist).
  const repoToml = fs.readFileSync(
    path.join(__dirname, "..", "..", "..", "config", "app.toml"),
    "utf8",
  );
  fs.writeFileSync(alt, repoToml.replace("port = 3001", "port = 5555"));
  const cfg = loadConfig({ NODE_ENV: "development", POKE_VAULT_CONFIG_PATH: alt });
  assert.equal(cfg.port, 5555);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("isValidCron5 / matchesCron behave", () => {
  assert.ok(isValidCron5("* * * * *"));
  assert.ok(isValidCron5("*/5 * * * *"));
  assert.ok(isValidCron5("0 3 * * 1-5"));
  assert.ok(!isValidCron5("0 25 * * *")); // hour out of range
  assert.ok(!isValidCron5("0 3 * *")); // 4 fields
  const noon = new Date(2026, 7, 13, 12, 0, 0); // local-time independent
  assert.ok(matchesCron("0 12 * * *", noon));
  assert.ok(!matchesCron("0 13 * * *", noon));
});
