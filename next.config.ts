import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // CMS users paste arbitrary cover URLs (Blogger, FB, Unsplash, etc.)
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
