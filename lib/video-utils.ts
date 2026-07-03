// Helper functions cho video (upload + embed YouTube/TikTok/Facebook)

export type VideoType = 'youtube' | 'tiktok' | 'facebook' | 'upload' | 'unknown';

// 1. Detect loại video từ URL
export function getVideoType(url: string): VideoType {
  if (!url || typeof url !== 'string') return 'unknown';
  const u = url.trim().toLowerCase();

  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';

  // Upload trực tiếp (Supabase Storage hoặc file tĩnh)
  if (
    u.includes('supabase.co/storage') ||
    u.startsWith('blob:') ||
    u.match(/\.(mp4|webm|mov|m4v|ogg)(\?|$)/)
  ) {
    return 'upload';
  }
  return 'unknown';
}

// 2a. Lấy YouTube ID từ URL
// Hỗ trợ: youtube.com/watch?v=xxx, youtu.be/xxx, youtube.com/shorts/xxx, youtube.com/embed/xxx
export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id || null;
    }

    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const parts = u.pathname.split('/').filter(Boolean);
      const i = parts.findIndex((p) => p === 'shorts' || p === 'embed' || p === 'v' || p === 'live');
      if (i !== -1 && parts[i + 1]) return parts[i + 1];
    }
    return null;
  } catch {
    return null;
  }
}

// 2b. Lấy TikTok ID từ URL
// Hỗ trợ: tiktok.com/@user/video/xxx, vm.tiktok.com/xxx, tiktok.com/t/xxx
export function getTikTokId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, '');
    const parts = u.pathname.split('/').filter(Boolean);

    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
      // /@user/video/{id}
      const vi = parts.findIndex((p) => p === 'video');
      if (vi !== -1 && parts[vi + 1]) return parts[vi + 1];
      // vm.tiktok.com/{shortcode} hoặc tiktok.com/t/{shortcode}
      if (host === 'vm.tiktok.com' && parts[0]) return parts[0];
      if (parts[0] === 't' && parts[1]) return parts[1];
    }
    return null;
  } catch {
    return null;
  }
}

// 3. Thumbnail URL
// YouTube: img.youtube.com/vi/{id}/hqdefault.jpg
// TikTok/Facebook: không có API public → placeholder SVG
// Upload: placeholder icon
export function getVideoThumbnail(url: string): string {
  const type = getVideoType(url);

  if (type === 'youtube') {
    const id = getYouTubeId(url);
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }

  if (type === 'tiktok') {
    return '/video-placeholder-tiktok.svg';
  }

  if (type === 'facebook') {
    return '/video-placeholder-facebook.svg';
  }

  return '/video-placeholder.svg';
}

// 3b. Chọn ẢNH ĐẠI DIỆN từ VIDEO cho thẻ tin KHÔNG có ảnh:
//   1) video tự upload → lấy khung hình đầu (poster qua thẻ <video>)
//   2) link YouTube → thumbnail thật của YouTube (img.youtube.com)
//   3) link khác (TikTok/Facebook) → nền video có nút play (placeholder)
export type VideoCover = { kind: 'video' | 'image' | 'placeholder'; src?: string };
export function pickVideoCover(videos?: string[] | null, videoLinks?: string[] | null): VideoCover | null {
  const vids = (videos || []).filter(Boolean);
  const links = (videoLinks || []).filter(Boolean);
  if (vids.length) return { kind: 'video', src: vids[0] };
  const yt = links.find(l => getVideoType(l) === 'youtube' && getYouTubeId(l));
  if (yt) return { kind: 'image', src: getVideoThumbnail(yt) };
  if (links.length) return { kind: 'placeholder' };
  return null;
}

// 4. Embed URL (để nhúng iframe)
export function getEmbedUrl(url: string): string | null {
  const type = getVideoType(url);

  if (type === 'youtube') {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (type === 'tiktok') {
    const id = getTikTokId(url);
    return id ? `https://www.tiktok.com/embed/v2/${id}` : null;
  }

  // Facebook không embed dễ → null (UI sẽ render link mở tab mới)
  return null;
}

// 5. Validate URL video
export function isValidVideoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;

    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const path = u.pathname.toLowerCase();

    // YouTube
    if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') {
      return !!getYouTubeId(trimmed);
    }

    // TikTok
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
      return !!getTikTokId(trimmed);
    }

    // Facebook: chỉ chấp nhận /watch hoặc /reel
    if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch') {
      if (host === 'fb.watch') return path.length > 1;
      return path.startsWith('/watch') || path.includes('/reel') || path.includes('/videos/');
    }

    return false;
  } catch {
    return false;
  }
}
