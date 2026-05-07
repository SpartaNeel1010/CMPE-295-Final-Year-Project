import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      // Clerk-hosted profile images
      { protocol: "https", hostname: "img.clerk.com" },
      // Google profile photos (used when signing in with Google via Clerk)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};


export default nextConfig;
