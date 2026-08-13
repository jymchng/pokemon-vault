import type { NextConfig } from "next";

/**
 * Pokémon Vault web → API wiring (§116, G54).
 *
 * The storefront consumes the real backend (NestJS /api/v1 on the API service).
 * Browser requests to `/api/v1/*` on the web origin are proxied server-side to
 * the API (POKE_VAULT_NEXT_PUBLIC_API_URL, default http://localhost:3001) — no
 * CORS, no credentials in the client, and the browser always talks to its own
 * origin.
 *
 * Env naming (G54): every user-facing env var carries the POKE_VAULT_ prefix.
 * Next.js only inlines `NEXT_PUBLIC_*` into client bundles at build time, so
 * the prefixed vars are bridged into NEXT_PUBLIC_* here (framework contract,
 * same as NODE_ENV) — the source of truth stays POKE_VAULT_NEXT_PUBLIC_*.
 */
const API_URL =
  process.env.POKE_VAULT_NEXT_PUBLIC_API_URL || "http://localhost:3001";
const MOCK_FALLBACK =
  process.env.POKE_VAULT_NEXT_PUBLIC_MOCK_FALLBACK === "true";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["194.163.151.162"],
  // Bridge prefixed vars into the client bundle (Next only inlines NEXT_PUBLIC_*).
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
    NEXT_PUBLIC_MOCK_FALLBACK: String(MOCK_FALLBACK),
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_URL}/api/v1/:path*`,
      },
    ];
  },
  // Netlify's static deployment does not run the on-demand image optimizer
  // (the /_next/image endpoint is not available), so serve images directly
  // from /public instead of routing them through next/image optimization.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
