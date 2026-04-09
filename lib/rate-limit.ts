// Simple in-memory rate limiter (không cần Redis cho giai đoạn đầu)
// Tự động cleanup entries cũ mỗi 60 giây

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60s
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key);
  });
}, 60_000);

interface RateLimitConfig {
  maxRequests: number;   // max requests per window
  windowMs: number;      // window in milliseconds
}

export const RATE_LIMITS = {
  auth: { maxRequests: 5, windowMs: 60_000 } as RateLimitConfig,       // 5 req/phút
  upload: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,    // 10 req/phút
  api: { maxRequests: 60, windowMs: 60_000 } as RateLimitConfig,       // 60 req/phút
};

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return '127.0.0.1';
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

import { NextResponse } from 'next/server';

/**
 * Apply rate limiting to an API route.
 * Returns NextResponse with 429 if rate limited, or null if OK.
 */
export function applyRateLimit(req: Request, type: keyof typeof RATE_LIMITS = 'api'): NextResponse | null {
  const ip = getClientIp(req);
  const config = RATE_LIMITS[type];
  const key = `${type}:${ip}`;
  const result = checkRateLimit(key, config);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Bạn thao tác quá nhanh, vui lòng thử lại sau.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  return null;
}
