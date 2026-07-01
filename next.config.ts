import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions ya están estables en Next 15; se dejan las mutaciones
    // como Server Actions en vez de API routes.
  },
};

export default nextConfig;
