'use client';
import { useState } from 'react';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * Bố cục ảnh cho CARD tin đăng: 1 ảnh to + 2 ảnh nhỏ bên cạnh (xếp dọc),
 * ảnh thứ 3 có overlay "+N" khi còn nhiều ảnh. Bấm vào BẤT KỲ ảnh nào → mở lightbox
 * xem hết (không điều hướng / không mở modal của card nhờ stopPropagation).
 *
 * Dùng được trong <Link> hoặc <div onClick> — click ảnh luôn chỉ mở lightbox.
 * Truyền `className` để chỉnh chiều cao vùng ảnh (mặc định h-48; dùng "h-full" khi
 * parent đã set chiều cao).
 */
export default function ListingImageMosaic({
  images,
  alt = 'Ảnh tin đăng',
  className = 'h-48',
}: {
  images?: string[] | null;
  alt?: string;
  className?: string;
}) {
  const [lightbox, setLightbox] = useState(false);
  const [idx, setIdx] = useState(0);

  const openAt = (e: React.MouseEvent, i: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx(i);
    setLightbox(true);
  };
  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  const list = images ?? [];

  if (list.length === 0) {
    return (
      <div className={`relative w-full ${className} bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center`}>
        <span className="text-4xl opacity-50">🏠</span>
      </div>
    );
  }

  const main = list.slice(0, 3);
  const imgClass = 'object-cover cursor-pointer hover:opacity-95 transition-opacity';
  const sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw';

  return (
    <>
      <div className={`relative w-full ${className} overflow-hidden bg-stone-100`}>
        {main.length === 1 && (
          <div className="absolute inset-0" onClick={e => openAt(e, 0)}>
            <OptimizedImage src={main[0]} alt={alt} fill sizes={sizes} className={imgClass} />
          </div>
        )}

        {main.length === 2 && (
          <div className="absolute inset-0 grid grid-cols-2 gap-1">
            {main.map((img, i) => (
              <div key={i} className="relative" onClick={e => openAt(e, i)}>
                <OptimizedImage src={img} alt={alt} fill sizes="50vw" className={imgClass} />
              </div>
            ))}
          </div>
        )}

        {main.length >= 3 && (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-1">
            <div className="col-span-2 row-span-2 relative" onClick={e => openAt(e, 0)}>
              <OptimizedImage src={main[0]} alt={alt} fill sizes={sizes} className={imgClass} />
            </div>
            <div className="relative" onClick={e => openAt(e, 1)}>
              <OptimizedImage src={main[1]} alt={alt} fill sizes="20vw" className={imgClass} />
            </div>
            <div className="relative" onClick={e => openAt(e, 2)}>
              <OptimizedImage src={main[2]} alt={alt} fill sizes="20vw" className={imgClass} />
              {list.length > 3 && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center cursor-pointer" onClick={e => openAt(e, 3)}>
                  <span className="text-white font-semibold text-sm">+{list.length - 3}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none">
          📷 {list.length}
        </span>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={e => { stop(e); setLightbox(false); }}>
          <button onClick={e => { stop(e); setLightbox(false); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 text-xl z-10">✕</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={list[idx]} alt="" className="max-w-full max-h-[85vh] object-contain rounded-lg" onClick={stop} />
          {list.length > 1 && (
            <>
              <button onClick={e => { stop(e); setIdx((idx - 1 + list.length) % list.length); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center">‹</button>
              <button onClick={e => { stop(e); setIdx((idx + 1) % list.length); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center">›</button>
              <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm">{idx + 1} / {list.length}</span>
            </>
          )}
        </div>
      )}
    </>
  );
}
