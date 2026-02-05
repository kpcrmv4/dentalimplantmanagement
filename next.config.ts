import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip static generation of error pages
  output: 'standalone',
  typescript: {
    // Allow build to succeed even with type errors during development
    ignoreBuildErrors: false,
  },
  eslint: {
    // Allow build to succeed even with lint errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
