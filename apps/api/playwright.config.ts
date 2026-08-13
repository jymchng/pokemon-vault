import { defineConfig } from "@playwright/test";

/**
 * E2E tests (§98) against a running local API. They exercise the real HTTP
 * API (register → login → browse → cart → checkout → order → collection →
 * pack-opening → reward-redemption → admin-inventory) on a DISPOSABLE test
 * database (infrastructure/db/setup-test-db.sh) — never production.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1, // sequential — the journey depends on prior state
  retries: 0,
  use: {
    baseURL: process.env.POKE_VAULT_E2E_API_URL || "http://localhost:3001",
    trace: "on-first-retry",
  },
  reporter: [["list"]],
});
