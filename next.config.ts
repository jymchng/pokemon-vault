import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["194.163.151.162"],
  // Netlify's static deployment does not run the on-demand image optimizer
  // (the /_next/image endpoint is not available), so serve images directly
  // from /public instead of routing them through next/image optimization.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
