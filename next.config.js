/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Uploaded image URLs are timestamp-unique and never overwritten, so the
    // optimized output is effectively immutable — cache it for 31 days.
    minimumCacheTTL: 2678400,
  },
  experimental: {
    optimizePackageImports: ['date-fns'],
  },
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      {
        source: '/icon-:slug*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};

// @next/bundle-analyzer is an optional devDependency, enabled only with ANALYZE=true.
// Wrapped defensively so a normal build never fails if the package is absent.
let withBundleAnalyzer = (config) => config;
try {
  withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true', openAnalyzer: false });
} catch {
  /* not installed — no-op */
}

module.exports = withBundleAnalyzer(nextConfig);
