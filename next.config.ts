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
  // Headers for PWA and Service Worker
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
