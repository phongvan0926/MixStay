'use client';
import { useState } from 'react';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { pickVideoCover } from '@/lib/video-utils';

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
  enableLightbox = false,
  videos,
  videoLinks,
}: {
  images?: string[] | null;
  alt?: string;
  className?: string;
  /** true: bấm ảnh mở lightbox (trang chi tiết). false (mặc định): click xuyên qua để
   *  parent xử lý — vd card trong <Link> sẽ vào thẳng trang chi tiết. */
  enableLightbox?: boolean;
  /** Khi KHÔNG có ảnh: dùng video để làm ảnh đại diện (khung hình/thumbnail). */
  videos?: string[] | null;
  videoLinks?: string[] | null;
}) {
  const [lightbox, setLightbox] = useState(false);
  const [idx, setIdx] = useState(0);

  const openAt = (e: React.MouseEvent, i: number) => {
    if (!enableLightbox) return; // để click bubble lên parent (card → trang chi tiết / modal)
    e.preventDefault();
    e.stopPropagation();
    setIdx(i);
    setLightbox(true);
  };
  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  const list = images ?? [];

  if (list.length === 0) {
    // Không có ảnh → thử lấy ảnh đại diện từ video cho đỡ trống.
    const cover = pickVideoCover(videos, videoLinks);
    if (cover) {
      return (
        <div className={`relative w-full ${className} overflow-hidden bg-stone-900`}>
          {cover.kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
          ) : cover.kind === 'video' ? (
            // preload="metadata" + #t=0.5 → hiện khung hình ~0.5s làm ảnh đại diện, không tải cả video.
            <video src={`${cover.src}#t=0.5`} preload="metadata" muted playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-700 to-brand-900" />
          )}
          {/* Nút play (chỉ trang trí, click xuyên qua để vào trang chi tiết) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-12 h-12 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center text-white text-lg shadow-lg">▶</span>
          </div>
          <span className="absolute bottom-2 right-2 bg-black/55 text-white text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none">🎬 Video</span>
        </div>
      );
    }
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
