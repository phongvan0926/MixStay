'use client';
import { useState, useEffect, useRef } from 'react';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * Gallery ảnh TRANG CHI TIẾT: hiển thị 1 ảnh và TỰ ĐỘNG TRƯỢT sang ảnh khác sau mỗi 2 giây.
 * Có mũi tên/chấm để chuyển tay; bấm ảnh mở lightbox xem to. Tạm dừng auto khi rê chuột.
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
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = (i: number) => setIdx((i + list.length) % list.length);
  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  // Tự trượt sau mỗi 2 giây (dừng khi chỉ có 1 ảnh, đang mở lightbox, hoặc đang rê chuột).
  useEffect(() => {
    if (list.length <= 1 || lightbox || paused) return;
    timer.current = setInterval(() => setIdx(i => (i + 1) % list.length), 2000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [list.length, lightbox, paused]);

  // Phím trong lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, idx, list.length]);

  if (list.length === 0) {
    return (
      <div className={`relative w-full aspect-[16/10] bg-gradient-to-br from-brand-100 to-brand-50 rounded-2xl flex items-center justify-center ${className}`}>
        <span className="text-5xl opacity-50">🏠</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-stone-100 group"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Ảnh hiện tại — bấm mở lightbox */}
        <div className="absolute inset-0 cursor-pointer" onClick={() => setLightbox(true)}>
          <OptimizedImage src={list[idx]} alt={alt} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" priority />
        </div>

        {/* Badge số ảnh */}
        <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none">
          📷 {idx + 1}/{list.length}
        </span>

        {list.length > 1 && (
          <>
            {/* Mũi tên */}
            <button type="button" aria-label="Ảnh trước" onClick={(e) => { stop(e); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/55">‹</button>
            <button type="button" aria-label="Ảnh sau" onClick={(e) => { stop(e); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/55">›</button>
            {/* Chấm */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {list.map((_, i) => (
                <button key={i} type="button" aria-label={`Ảnh ${i + 1}`} onClick={(e) => { stop(e); go(i); }}
                  className={`h-1.5 rounded-full transition-all ${i === idx ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <button onClick={(e) => { stop(e); setLightbox(false); }}
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
