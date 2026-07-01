'use client';
import { useState, useEffect } from 'react';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * Gallery ảnh cho TRANG CHI TIẾT sản phẩm: hiển thị HẾT tất cả ảnh (không cắt "+N"),
 * bố cục đẹp + responsive. Bấm ảnh bất kỳ mở lightbox xem lần lượt (‹ › Esc).
 * Khác ListingImageMosaic (dùng cho CARD, chỉ 1 to + 2 nhỏ + overlay "+N").
 */
export default function ListingImageGallery({
  images,
  alt = 'Ảnh tin đăng',
  className = '',
}: {
  images?: string[] | null;
  alt?: string;
  className?: string;
}) {
  const list = (images ?? []).filter(Boolean);
  const [lightbox, setLightbox] = useState(false);
  const [idx, setIdx] = useState(0);

  const open = (i: number) => { setIdx(i); setLightbox(true); };
  const close = () => setLightbox(false);
  const prev = () => setIdx(i => (i - 1 + list.length) % list.length);
  const next = () => setIdx(i => (i + 1) % list.length);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  // Phím Esc / ‹ › khi mở lightbox.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, list.length]);

  if (list.length === 0) {
    return (
      <div className={`relative w-full aspect-[16/10] bg-gradient-to-br from-brand-100 to-brand-50 rounded-2xl flex items-center justify-center ${className}`}>
        <span className="text-5xl opacity-50">🏠</span>
      </div>
    );
  }

  const imgClass = 'object-cover cursor-pointer hover:opacity-95 transition-opacity';
  const hero = list[0];
  const rest = list.slice(1);

  return (
    <div className={className}>
      <div className="space-y-2">
        {/* Ảnh chính (hero) — full width */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-stone-100" onClick={() => open(0)}>
          <OptimizedImage src={hero} alt={alt} fill sizes="(max-width: 768px) 100vw, 768px" className={imgClass} priority />
          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none">
            📷 {list.length} ảnh
          </span>
        </div>

        {/* Các ảnh còn lại — lưới responsive, hiện HẾT */}
        {rest.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {rest.map((img, i) => (
              <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-stone-100" onClick={() => open(i + 1)}>
                <OptimizedImage src={img} alt={alt} fill sizes="(max-width: 640px) 50vw, 33vw" className={imgClass} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={close}>
          <button onClick={(e) => { stop(e); close(); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 text-xl z-10">✕</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={list[idx]} alt="" className="max-w-full max-h-[85vh] object-contain rounded-lg" onClick={stop} />
          {list.length > 1 && (
            <>
              <button onClick={(e) => { stop(e); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center text-xl">‹</button>
              <button onClick={(e) => { stop(e); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center text-xl">›</button>
              <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm">{idx + 1} / {list.length}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
