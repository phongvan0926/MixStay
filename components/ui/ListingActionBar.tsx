'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  images?: string[];
  shareUrl: string;   // link bài đăng để chia sẻ
  copyText: string;   // toàn bộ nội dung bài đăng (để copy sang nền tảng khác)
  title?: string;
  fileBase?: string;  // tiền tố tên file ảnh khi tải về
  className?: string;
}

/**
 * Thanh công cụ cho 1 bài đăng: Tải tất cả ảnh (từng file rời, không nén zip), Copy toàn bộ nội dung,
 * và Chia sẻ ra ngoài (Web Share API trên mobile → Zalo/Messenger/Facebook;
 * fallback menu Facebook/Zalo/Messenger/Copy link trên desktop).
 *
 * ⚠️ KHÔNG GỠ "Tải ảnh" / "Copy nội dung" khỏi trang công khai — đây là CHỦ ĐÍCH của MixStay,
 * không phải sơ hở. Ai cũng dùng được, kể cả khách chưa đăng nhập: mục tiêu là để người ta
 * mang tin đi đăng lại trên NHIỀU nền tảng khác một cách dễ dàng — càng nhiều nơi đăng thì
 * tin càng tới được nhiều khách thuê. Số nhà đã được che ở tầng dữ liệu (redactTitle /
 * redactHouseNumber / redactPublicText trong lib/address.ts) nên nội dung mang đi vẫn an toàn.
 * Bản kiểm định 07/08/2026 từng đề xuất ẩn 2 nút này; chủ dự án đã bác bỏ và giải thích ý đồ.
 */
export default function ListingActionBar({ images = [], shareUrl, copyText, title = 'Tin cho thuê', fileBase = 'anh-tin-dang', className = '' }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const absUrl = (() => {
    if (/^https?:\/\//.test(shareUrl)) return shareUrl;
    if (typeof window !== 'undefined') return window.location.origin + shareUrl;
    return shareUrl;
  })();

  // iPadOS giả dạng macOS trong userAgent → nhận diện thêm bằng cảm ứng đa điểm.
  const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const downloadImages = async () => {
    const list = (images || []).filter(Boolean);
    if (!list.length) { toast.error('Bài đăng chưa có ảnh'); return; }
    setDownloading(true);
    try {
      // Fetch hết ảnh về trước (song song), dùng chung cho cả 2 đường tải bên dưới.
      const files = (await Promise.all(list.map(async (src, i) => {
        try {
          const res = await fetch(src);
          if (!res.ok) return null;
          const blob = await res.blob();
          const ext = ((blob.type.split('/')[1] || 'jpg').split('+')[0]).slice(0, 5);
          return new File([blob], `${fileBase}-${String(i + 1).padStart(2, '0')}.${ext}`, { type: blob.type || 'image/jpeg' });
        } catch { return null; /* bỏ ảnh lỗi */ }
      }))).filter((f): f is File => f !== null);
      if (files.length === 0) { toast.error('Không tải được ảnh, thử lại sau'); return; }

      // ĐƯỜNG iOS — BẮT BUỘC dùng Web Share API với files. iOS Safari không cho tải nhiều
      // file liên tiếp bằng <a download>: mỗi lượt click bật 1 hộp thoại "Tải về?", các hộp
      // thoại đè nhau và chỉ lượt CUỐI được lưu thật (lỗi báo 14/08/2026: "pop-up hiện liên
      // tục nhưng chỉ tải được ảnh cuối"). Share sheet mở đúng 1 lần, bấm "Lưu N ảnh" là cả
      // bộ vào Photos — còn tiện hơn rơi vào app Tệp.
      const nav = navigator as any;
      if (isIOS() && typeof nav.share === 'function' && nav.canShare?.({ files })) {
        try {
          await nav.share({ files });
          toast.success(`Đã gửi ${files.length} ảnh — chọn "Lưu ảnh" để lưu vào máy`);
          return;
        } catch (e: any) {
          if (e?.name === 'AbortError') return; // người dùng tự đóng share sheet — không phải lỗi
          // NotAllowedError (mạng chậm làm mất user gesture)… → rơi xuống cách tải từng file
        }
      }

      // ĐƯỜNG CÒN LẠI: tải từng ảnh rời (không nén zip — khỏi giải nén) bằng <a download>
      // tuần tự. Chrome sẽ hỏi "Cho phép tải nhiều tệp?" đúng 1 lần.
      const urls: string[] = [];
      for (const f of files) {
        const url = URL.createObjectURL(f);
        urls.push(url);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Chờ 1 nhịp giữa các lượt click — kích liên tiếp 0ms dễ bị trình duyệt nuốt bớt lượt tải
        await new Promise(r => setTimeout(r, 350));
      }
      // Revoke SAU CÙNG và trễ hẳn 60s: Safari bật hộp thoại xác nhận cho TỪNG file, revoke
      // sớm là thu hồi blob trước khi người dùng kịp bấm "Tải về" → chỉ file cuối sống sót.
      setTimeout(() => urls.forEach(u => URL.revokeObjectURL(u)), 60_000);
      toast.success(`Đã tải ${files.length} ảnh về máy`);
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

  // min-h-11: vùng bấm đạt 44px cho ngón tay (đo 07/08/2026: các nút này chỉ cao 38px)
  const btn = 'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-11 rounded-lg text-sm font-medium border transition-colors';

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
