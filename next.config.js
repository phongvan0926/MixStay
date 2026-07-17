// Content-Security-Policy — cân chỉnh cho app: nhúng YouTube/TikTok/Facebook, ảnh/video Supabase,
// Google Fonts. 'unsafe-eval' CHỈ bật ở dev (HMR cần); prod chặt hơn. 'unsafe-inline' cho script
// vẫn cần vì Next App Router chèn inline hydration script (chưa dùng nonce) — vẫn chặn script ngoài.
const isDev = process.env.NODE_ENV !== 'production';
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
  "media-src 'self' https://*.supabase.co blob:",
  // maps.google.com + www.google.com: iframe Google Maps (output=embed) ở trang tin đăng — thiếu là "This content is blocked"
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.tiktok.com https://www.facebook.com https://web.facebook.com https://maps.google.com https://www.google.com",
  'upgrade-insecure-requests',
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
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
      // Header bảo mật áp cho MỌI route (CSP, chống clickjacking, nosniff, referrer, permissions).
      { source: '/:path*', headers: SECURITY_HEADERS },
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
