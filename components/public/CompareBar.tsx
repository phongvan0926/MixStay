'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSavedIds, onSavedChange } from '@/lib/saved-guest';

/**
 * Thanh nổi "Đã lưu (N) — So sánh" cho khách vãng lai.
 * Chỉ hiện khi có ít nhất 1 tin đã lưu; ẩn trên chính trang /da-luu.
 * Đặt giữa đáy màn hình để không đè lên FAB Gọi/Zalo ở góc phải.
 */
export default function CompareBar() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    setCount(getSavedIds().length);
    return onSavedChange(() => setCount(getSavedIds().length));
  }, []);

  if (count === 0 || pathname === '/da-luu') return null;

  return (
    <Link
      href="/da-luu"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-stone-900/90 text-white text-sm font-semibold shadow-lg backdrop-blur-sm hover:bg-stone-900 transition-colors"
    >
      ❤ Đã lưu {count} tin
      <span className="text-white/60">•</span>
      So sánh →
    </Link>
  );
}
