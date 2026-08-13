import { defineConfig } from "@playwright/test";

/**
 * Storefront E2E (G53) — full-stack browser journey through the Next.js
 * storefront against a LIVE dev environment (api + web + postgres + redis,
 * provisioned by scripts/dev-env.sh). The web server proxies /api/v1 to the
 * API, so the browser exercises the real backend.
 *
 * Requires: `scripts/dev-env.sh up` (or docker compose up + pnpm dev).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1, // sequential — the journey depends on prior state
  retries: 0,
  use: {
    baseURL: process.env.E2E_WEB_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  reporter: [["list"]],
});
