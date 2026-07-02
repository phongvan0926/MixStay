'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  images?: string[];
  shareUrl: string;   // link bài đăng để chia sẻ
  copyText: string;   // toàn bộ nội dung bài đăng (để copy sang nền tảng khác)
  title?: string;
  fileBase?: string;  // tên file zip ảnh
  className?: string;
}

/**
 * Thanh công cụ cho 1 bài đăng: Tải tất cả ảnh (.zip), Copy toàn bộ nội dung,
 * và Chia sẻ ra ngoài (Web Share API trên mobile → Zalo/Messenger/Facebook;
 * fallback menu Facebook/Zalo/Messenger/Copy link trên desktop).
 */
export default function ListingActionBar({ images = [], shareUrl, copyText, title = 'Tin cho thuê', fileBase = 'anh-tin-dang', className = '' }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const absUrl = (() => {
    if (/^https?:\/\//.test(shareUrl)) return shareUrl;
    if (typeof window !== 'undefined') return window.location.origin + shareUrl;
    return shareUrl;
  })();

  const downloadImages = async () => {
    const list = (images || []).filter(Boolean);
    if (!list.length) { toast.error('Bài đăng chưa có ảnh'); return; }
    setDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      let ok = 0;
      for (let i = 0; i < list.length; i++) {
        try {
          const res = await fetch(list[i]);
          if (!res.ok) continue;
          const blob = await res.blob();
          const ext = ((blob.type.split('/')[1] || 'jpg').split('+')[0]).slice(0, 5);
          zip.file(`anh-${String(i + 1).padStart(2, '0')}.${ext}`, blob);
          ok++;
        } catch { /* bỏ ảnh lỗi */ }
      }
      if (ok === 0) { toast.error('Không tải được ảnh, thử lại sau'); return; }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileBase}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Đã tải ${ok} ảnh (.zip)`);
    } catch {
      toast.error('Lỗi khi tải ảnh');
    } finally {
      setDownloading(false);
    }
  };

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      toast.success('Đã copy nội dung bài đăng');
    } catch {
      toast.error('Không copy được, thử lại');
    }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(absUrl); toast.success('Đã copy link bài đăng'); } catch {}
    setMenuOpen(false);
  };

  const share = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: `${title}\n${absUrl}`, url: absUrl });
        return;
      } catch { return; /* user huỷ */ }
    }
    setMenuOpen(o => !o);
  };

  const enc = encodeURIComponent;
  const openWin = (url: string) => window.open(url, '_blank', 'noopener,width=640,height=560');

  const shareFacebook = () => { openWin(`https://www.facebook.com/sharer/sharer.php?u=${enc(absUrl)}`); setMenuOpen(false); };
  const shareZalo = async () => {
    // Zalo không có URL share web ổn định → copy link + mở Zalo để dán.
    try { await navigator.clipboard.writeText(absUrl); } catch {}
    openWin('https://zalo.me/');
    toast.success('Đã copy link — dán vào Zalo để chia sẻ');
    setMenuOpen(false);
  };
  const shareMessenger = async () => {
    // Mobile: mở app Messenger; desktop: copy link để dán.
    try { await navigator.clipboard.writeText(absUrl); } catch {}
    window.open(`fb-messenger://share/?link=${enc(absUrl)}`, '_blank');
    toast.success('Đã copy link — dán vào Messenger nếu chưa mở được app');
    setMenuOpen(false);
  };

  const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button type="button" onClick={downloadImages} disabled={downloading}
        className={`${btn} bg-white border-stone-200 text-stone-700 hover:border-brand-300 hover:text-brand-700 disabled:opacity-60`}>
        {downloading ? '⏳ Đang tải...' : '⬇️ Tải ảnh'}
      </button>

      <button type="button" onClick={copyContent}
        className={`${btn} bg-white border-stone-200 text-stone-700 hover:border-brand-300 hover:text-brand-700`}>
        📋 Copy nội dung
      </button>

      <div className="relative">
        <button type="button" onClick={share}
          className={`${btn} bg-brand-600 border-brand-600 text-white hover:bg-brand-700`}>
          🔗 Chia sẻ
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-1 w-48 bg-white rounded-xl border border-stone-200 shadow-lg py-1">
              <button type="button" onClick={shareFacebook} className="w-full px-3 py-2 text-left text-sm hover:bg-stone-50 flex items-center gap-2">📘 Facebook</button>
              <button type="button" onClick={shareMessenger} className="w-full px-3 py-2 text-left text-sm hover:bg-stone-50 flex items-center gap-2">✉️ Messenger</button>
              <button type="button" onClick={shareZalo} className="w-full px-3 py-2 text-left text-sm hover:bg-stone-50 flex items-center gap-2">💬 Zalo</button>
              <button type="button" onClick={copyLink} className="w-full px-3 py-2 text-left text-sm hover:bg-stone-50 flex items-center gap-2">🔗 Copy link</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
