// lib/gemini.ts — Helper gọi Gemini SERVER-SIDE dùng chung (key không bao giờ ra client).
// Hỗ trợ NHIỀU API key (nhiều tài khoản Google) để TỰ XOAY khi 1 key hết quota free:
// GEMINI_API_KEY, GEMINI_API_KEY_2..10, và GEMINI_API_KEYS (danh sách ngăn cách bởi dấu phẩy).
// Model đổi qua env GEMINI_MODEL (mặc định gemini-2.5-flash).

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export function getGeminiKeys(): string[] {
  const set = new Set<string>();
  const add = (v?: string) => v?.split(',').forEach(k => { const t = k.trim(); if (t) set.add(t); });
  add(process.env.GEMINI_API_KEYS);
  add(process.env.GEMINI_API_KEY);
  for (let i = 2; i <= 10; i++) add(process.env[`GEMINI_API_KEY_${i}`]);
  return Array.from(set);
}

export type GeminiResult =
  | { ok: true; data: any; text: string }
  | { ok: false; status: number; quotaHit: boolean };

/**
 * Gọi generateContent, thử lần lượt từng key; key nào hết quota (429) thì xoay key kế tiếp.
 * Trả về { ok, data, text } — text là toàn bộ parts đã nối.
 */
export async function callGemini(payload: object): Promise<GeminiResult> {
  const apiKeys = getGeminiKeys();
  let lastStatus = 0;
  let quotaHit = false;
  for (const key of apiKeys) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    if (res.ok) {
      const data = await res.json();
      const text: string = (data?.candidates?.[0]?.content?.parts || [])
        .map((p: any) => p?.text || '').join('').trim();
      return { ok: true, data, text };
    }
    lastStatus = res.status;
    if (res.status === 429) { quotaHit = true; continue; } // hết lượt key này → thử key khác
    console.error('Gemini error', res.status, (await res.text()).slice(0, 300));
    break; // lỗi khác (400/500...) không phải quota → không xoay tiếp
  }
  return { ok: false, status: lastStatus, quotaHit };
}
