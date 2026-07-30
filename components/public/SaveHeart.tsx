'use client';
import { useEffect, useState } from 'react';
import { isSaved, toggleSaved, onSavedChange } from '@/lib/saved-guest';

/**
 * Nút ❤ lưu tin cho KHÁCH VÃNG LAI (localStorage, không cần đăng nhập).
 * Dùng được bên trong <Link> — luôn preventDefault/stopPropagation để không điều hướng.
 */
export default function SaveHeart({ id, size = 'sm' }: { id: string; size?: 'sm' | 'lg' }) {
  // Khởi tạo false rồi đọc localStorage sau mount — tránh lệch HTML server/client (hydration).
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(isSaved(id));
    return onSavedChange(() => setSaved(isSaved(id)));
  }, [id]);

  const cls =
    size === 'lg'
      ? 'w-11 h-11 text-xl'
      : 'w-8 h-8 text-sm';

  return (
    <button
      type="button"
      aria-label={saved ? 'Bỏ lưu tin' : 'Lưu tin để so sánh'}
      title={saved ? 'Bỏ lưu tin' : 'Lưu tin để so sánh (không cần đăng nhập)'}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        setSaved(toggleSaved(id));
      }}
      className={`${cls} inline-flex items-center justify-center rounded-full shadow backdrop-blur-sm transition-all ${
        saved
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'bg-white/90 text-stone-500 hover:text-red-500 border border-white'
      }`}
    >
      {saved ? '❤' : '🤍'}
    </button>
  );
}
