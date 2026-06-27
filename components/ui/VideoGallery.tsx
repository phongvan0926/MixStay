'use client';
import { useEffect, useMemo, useState } from 'react';
import ListingImageMosaic from '@/components/ui/ListingImageMosaic';
import VideoPlayer from '@/components/ui/VideoPlayer';
import { getVideoThumbnail, getVideoType, type VideoType } from '@/lib/video-utils';

interface VideoGalleryProps {
  videos?: string[];
  videoLinks?: string[];
  images?: string[];
}

type VideoItem = {
  url: string;
  type: Exclude<VideoType, 'unknown'>;
  thumbnail: string | null;
};

const platformBadge: Record<VideoItem['type'], { label: string; color: string }> = {
  youtube: { label: 'YouTube', color: 'bg-red-600' },
  tiktok: { label: 'TikTok', color: 'bg-black' },
  facebook: { label: 'Facebook', color: 'bg-blue-600' },
  upload: { label: 'Video', color: 'bg-brand-600' },
};

function VideoThumb({ item }: { item: VideoItem }) {
  const [error, setError] = useState(false);

  if (item.type === 'upload') {
    return (
      <video
        src={item.url}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        preload="metadata"
        muted
        playsInline
      />
    );
  }

  if (item.thumbnail && !error) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.thumbnail}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        onError={() => setError(true)}
      />
    );
  }

  const gradient =
    item.type === 'tiktok'
      ? 'from-stone-800 to-black'
      : item.type === 'facebook'
        ? 'from-blue-500 to-blue-700'
        : item.type === 'youtube'
          ? 'from-red-500 to-red-700'
          : 'from-brand-500 to-brand-800';
  return <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />;
}

// ==================== Videos Tab ====================
function VideosTab({ items }: { items: VideoItem[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [featured, ...rest] = items;

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') setLightboxIdx((i) => (i === null ? null : (i + 1) % items.length));
      if (e.key === 'ArrowLeft') setLightboxIdx((i) => (i === null ? null : (i - 1 + items.length) % items.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, items.length]);

  const renderCard = (item: VideoItem, idx: number, big: boolean) => {
    const badge = platformBadge[item.type];
    return (
      <button
        key={item.url}
        type="button"
        onClick={() => setLightboxIdx(idx)}
        className={`relative group rounded-2xl overflow-hidden bg-stone-900 w-full ${big ? 'aspect-video' : 'aspect-video'}`}
      >
        <VideoThumb item={item} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20 group-hover:from-black/60 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${big ? 'w-20 h-20' : 'w-14 h-14'} rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-all group-hover:scale-110`}>
            <svg className={`${big ? 'w-9 h-9' : 'w-6 h-6'} text-brand-700 translate-x-0.5`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <span className={`absolute top-3 left-3 text-[10px] font-medium text-white ${badge.color} px-2 py-1 rounded`}>
          {badge.label}
        </span>
        {idx === 0 && big && (
          <span className="absolute top-3 right-3 text-[10px] font-medium text-white bg-brand-600 px-2 py-1 rounded">
            Nổi bật
          </span>
        )}
      </button>
    );
  };

  const lightboxItem = lightboxIdx !== null ? items[lightboxIdx] : null;

  return (
    <>
      <div className="space-y-3">
        {featured && renderCard(featured, 0, true)}
        {rest.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {rest.map((item, i) => renderCard(item, i + 1, false))}
          </div>
        )}
      </div>

      {lightboxItem && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 text-xl z-10"
          >
            ✕
          </button>
          <div
            className="relative w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <VideoPlayer url={lightboxItem.url} type={lightboxItem.type} autoplay />
          </div>
          {items.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightboxIdx! - 1 + items.length) % items.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center text-2xl"
              >‹</button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightboxIdx! + 1) % items.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center text-2xl"
              >›</button>
              <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm">
                {lightboxIdx! + 1} / {items.length}
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ==================== Main ====================
export default function VideoGallery({ videos = [], videoLinks = [], images = [] }: VideoGalleryProps) {
  const videoItems = useMemo<VideoItem[]>(() => {
    const uploads: VideoItem[] = videos.map((url) => ({ url, type: 'upload', thumbnail: null }));
    const linked: VideoItem[] = videoLinks
      .map((url): VideoItem | null => {
        const type = getVideoType(url);
        if (type === 'unknown') return null;
        return { url, type, thumbnail: getVideoThumbnail(url) };
      })
      .filter((v): v is VideoItem => v !== null);
    return [...uploads, ...linked];
  }, [videos, videoLinks]);

  const hasImages = images.length > 0;
  const hasVideos = videoItems.length > 0;

  const [tab, setTab] = useState<'images' | 'videos'>(hasImages ? 'images' : 'videos');

  // Keep tab in sync when data changes
  useEffect(() => {
    if (tab === 'images' && !hasImages && hasVideos) setTab('videos');
    if (tab === 'videos' && !hasVideos && hasImages) setTab('images');
  }, [tab, hasImages, hasVideos]);

  // Empty state
  if (!hasImages && !hasVideos) {
    return (
      <div className="h-64 md:h-80 bg-gradient-to-br from-brand-100 via-brand-50 to-gold-50 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">🏢</span>
          <p className="text-sm text-stone-400 mt-2">Chưa có ảnh/video</p>
        </div>
      </div>
    );
  }

  // Chỉ có 1 loại → không hiện tab bar
  if (hasImages && !hasVideos) return <ListingImageMosaic images={images} enableLightbox className="h-64 sm:h-80 md:h-96 rounded-2xl" />;
  if (hasVideos && !hasImages) return <VideosTab items={videoItems} />;

  return (
    <div>
      <div className="flex gap-2 mb-3 border-b border-stone-200">
        <button
          type="button"
          onClick={() => setTab('images')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            tab === 'images'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          📷 Ảnh ({images.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('videos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            tab === 'videos'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          🎬 Video ({videoItems.length})
        </button>
      </div>

      {tab === 'images' ? <ListingImageMosaic images={images} enableLightbox className="h-64 sm:h-80 md:h-96 rounded-2xl" /> : <VideosTab items={videoItems} />}
    </div>
  );
}
