import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    market: {
      stale: 30,
      revalidate: 60,
      expire: 300,
    },
    tvl: {
      stale: 60,
      revalidate: 300,
      expire: 1800,
    },
    directory: {
      stale: 300,
      revalidate: 3600,
      expire: 86_400,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "icons.llamao.fi",
        pathname: "/icons/protocols/**",
      },
    ],
  },
};

export default nextConfig;
