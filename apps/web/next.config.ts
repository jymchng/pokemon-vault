import type { NextConfig } from "next";

/**
 * Pokémon Vault web → API wiring (§116).
 *
 * The storefront consumes the real backend (NestJS /api/v1 on the API service).
 * Browser requests to `/api/v1/*` on the web origin are proxied server-side to
 * the API (NEXT_PUBLIC_API_URL, default http://localhost:3001) — no CORS, no
 * credentials in the client, and the browser always talks to its own origin.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["194.163.151.162"],
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
