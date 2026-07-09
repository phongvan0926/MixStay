// Rate limiter phân tán — dùng Upstash/Vercel KV (REST) khi được cấu hình, nếu không thì
// fallback in-memory (per-instance). Cấu hình KV bằng ENV (Vercel KV tự set 2 biến đầu):
//   KV_REST_API_URL / KV_REST_API_TOKEN   (Vercel KV)  — hoặc —
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   (Upstash)
// Không cần thêm package: gọi thẳng REST API bằng fetch.
import { NextResponse } from 'next/server';

interface RateLimitConfig {
  maxRequests: number; // số request tối đa mỗi cửa sổ
  windowMs: number;    // độ dài cửa sổ (ms)
}

export const RATE_LIMITS = {
  auth: { maxRequests: 5, windowMs: 60_000 } as RateLimitConfig,       // 5 req/phút
  upload: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,    // 10 req/phút
  api: { maxRequests: 60, windowMs: 60_000 } as RateLimitConfig,       // 60 req/phút
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return '127.0.0.1';
}

// --- Backend KV (Upstash REST) — chỉ bật khi có đủ URL + TOKEN ------------------
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const KV_ENABLED = !!(KV_URL && KV_TOKEN);

// Fixed-window: INCR để đếm; PEXPIRE ... NX đặt TTL ở request đầu tiên; PTTL để tính resetAt.
async function kvCheck(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  try {
    const res = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['PEXPIRE', key, config.windowMs, 'NX'],
        ['PTTL', key],
      ]),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`kv ${res.status}`);
    const data: Array<{ result?: unknown; error?: unknown }> = await res.json();
    const count = Number(data?.[0]?.result ?? 0);
    let ttl = Number(data?.[2]?.result ?? config.windowMs);
    if (!Number.isFinite(ttl) || ttl < 0) ttl = config.windowMs; // -1 (no TTL) / -2 (missing)
    const resetAt = Date.now() + ttl;
    if (!Number.isFinite(count) || count <= 0) return { success: true, remaining: config.maxRequests - 1, resetAt };
    if (count > config.maxRequests) return { success: false, remaining: 0, resetAt };
    return { success: true, remaining: config.maxRequests - count, resetAt };
  } catch {
    // KV lỗi/không truy cập được → KHÔNG chặn oan, fallback đếm in-memory (có kiểm soát).
    return memCheck(key, config);
  }
}

// --- Fallback in-memory (per-instance; chỉ dùng khi CHƯA cấu hình KV) -----------
interface MemEntry { count: number; resetAt: number; }
const memStore = new Map<string, MemEntry>();
if (!KV_ENABLED) {
  setInterval(() => {
    const now = Date.now();
    memStore.forEach((e, k) => { if (now > e.resetAt) memStore.delete(k); });
  }, 60_000).unref?.();
}

function memCheck(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }
  if (entry.count >= config.maxRequests) return { success: false, remaining: 0, resetAt: entry.resetAt };
  entry.count++;
  return { success: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  return KV_ENABLED ? kvCheck(key, config) : memCheck(key, config);
}

/**
 * Áp rate limit cho 1 API route. Trả NextResponse 429 nếu vượt giới hạn, hoặc null nếu OK.
 * BẮT BUỘC await: `const rl = await applyRateLimit(req, 'api'); if (rl) return rl;`
 */
export async function applyRateLimit(
  req: Request,
  type: keyof typeof RATE_LIMITS = 'api',
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const config = RATE_LIMITS[type];
  const key = `rl:${type}:${ip}`;
  const result = await checkRateLimit(key, config);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Bạn thao tác quá nhanh, vui lòng thử lại sau.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)) },
      }
    );
  }
  return null;
}
