import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is loaded opaquely (see src/lib/load-sharp.ts) so OpenNext does not
  // try to bundle the native module into the Worker. Turso uses @libsql/client/web.
  serverExternalPackages: [],
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
