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

  // VÙNG BẤM 44×44 (chuẩn tối thiểu cho ngón tay) nhưng HÌNH TRÒN nhìn thấy vẫn nhỏ gọn.
  // Đo 07/08/2026: nút cũ chỉ 32×32 mà mỗi trang đích có tới 24 cái — khách bấm trượt sang
  // thẻ tin và bị điều hướng đi mất. Tách vỏ trong suốt (hit area) khỏi lõi có màu (thị giác).
  const box = size === 'lg' ? 'w-12 h-12' : 'w-11 h-11';
  const dot = size === 'lg' ? 'w-11 h-11 text-xl' : 'w-8 h-8 text-sm';

  return (
    <button
      type="button"
      aria-label={saved ? 'Bỏ lưu tin' : 'Lưu tin để so sánh'}
      aria-pressed={saved}
      title={saved ? 'Bỏ lưu tin' : 'Lưu tin để so sánh (không cần đăng nhập)'}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        setSaved(toggleSaved(id));
      }}
      className={`${box} -m-1.5 inline-flex items-center justify-center rounded-full group/heart`}
    >
      <span
        className={`${dot} inline-flex items-center justify-center rounded-full shadow backdrop-blur-sm transition-all group-active/heart:scale-90 ${
          saved
            ? 'bg-red-500 text-white group-hover/heart:bg-red-600'
            : 'bg-white/90 text-stone-500 group-hover/heart:text-red-500 border border-white'
        }`}
      >
        {saved ? '❤' : '🤍'}
      </span>
    </button>
  );
}
