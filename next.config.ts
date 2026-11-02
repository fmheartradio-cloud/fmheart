import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is native; optional on Cloudflare Workers. libsql talks HTTP to Turso.
  serverExternalPackages: ["sharp", "@libsql/client"],
  images: {
    // CMS users paste arbitrary cover URLs (Blogger, FB, Unsplash, etc.)
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
