import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep sharp as a native Node package so newsbot watermark detect loads on Vercel.
  serverExternalPackages: ["sharp"],
  images: {
    // CMS users paste arbitrary cover URLs (Blogger, FB, Unsplash, etc.)
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
