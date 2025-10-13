import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.sandbox.midtrans.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', '@supabase/ssr'],
  },
};

export default nextConfig;
