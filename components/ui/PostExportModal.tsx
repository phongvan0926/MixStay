'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { buildSocialPost, type SocialPostInput } from '@/lib/social-post';

/**
 * "Đăng Facebook/Zalo" — gói sẵn 1 bài đăng để CTV/chủ nhà chỉ việc dán.
 *
 * Thị trường này chạy trên nhóm Facebook/Zalo chứ không chạy trên web: kho 758 tin mà chỉ
 * 1.813 lượt xem. Việc mất thời gian nhất khi đăng là ngồi gõ lại caption và tự ghép ảnh có
 * giá — modal này làm sẵn cả hai:
 *  - Ảnh bìa 1080×1350 in sẵn giá / diện tích / khu vực (`/api/poster/[id]`)
 *  - Caption có tiêu đề bắt mắt + hashtag theo quận + link + SĐT, sửa được trước khi copy
 */
export default function PostExportModal({
  open,
  onClose,
  roomTypeId,
  post,
}: {
  open: boolean;
  onClose: () => void;
  roomTypeId: string;
  post: SocialPostInput;
}) {
  const [caption, setCaption] = useState(() => buildSocialPost(post));
  const [downloading, setDownloading] = useState(false);

  if (!open) return null;

  const posterUrl = `/api/poster/${roomTypeId}`;

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Đã copy caption — dán thẳng vào Facebook/Zalo');
    } catch {
      toast.error('Trình duyệt chặn copy, bạn bôi đen rồi Ctrl+C nhé');
    }
  };

  const downloadPoster = async () => {
    setDownloading(true);
    try {
      const res = await fetch(posterUrl);
      if (!res.ok) throw new Error('poster');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mixstay-${post.listingCode || roomTypeId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke TRỄ 60s, không revoke ngay: iOS Safari bật hộp thoại "Tải về?" và người dùng
      // phải bấm đồng ý — revoke ngay sau click() là thu hồi blob trước khi họ kịp bấm.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success('Đã tải ảnh bìa về máy');
    } catch {
      toast.error('Không tạo được ảnh bìa, thử lại sau');
    } finally {
      setDownloading(false);
    }
  };

  const openFacebook = () => {
    // Facebook không cho điền sẵn caption qua URL (chính sách từ 2018) → copy trước rồi mở.
    copyCaption();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(post.url)}`, '_blank', 'noopener');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-3.5 flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg">📢 Đăng Facebook / Zalo</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-2xl leading-none px-2" aria-label="Đóng">×</button>
        </div>

        <div className="p-5 grid sm:grid-cols-[260px_1fr] gap-5">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Ảnh bìa (1080×1350)</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={posterUrl} alt="Ảnh bìa bài đăng" className="w-full rounded-xl border border-stone-200 bg-stone-100" />
            <button onClick={downloadPoster} disabled={downloading}
              className="btn-primary w-full mt-2.5 py-2.5 text-sm disabled:opacity-60">
              {downloading ? 'Đang tạo…' : '⬇️ Tải ảnh bìa'}
            </button>
            <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">
              Ảnh đã in sẵn giá, diện tích, khu vực — người lướt feed không cần mở bài vẫn biết.
            </p>
          </div>

          <div className="flex flex-col">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Nội dung bài đăng (sửa được)</p>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={16}
              className="input-field text-sm font-mono leading-relaxed flex-1 min-h-[300px]"
            />
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              <button onClick={copyCaption} className="btn-primary py-2.5 text-sm">📋 Copy nội dung</button>
              <button onClick={openFacebook}
                className="py-2.5 text-sm font-semibold rounded-xl text-white bg-[#1877F2] hover:bg-[#166fe0] transition-colors">
                Mở Facebook
              </button>
            </div>
            <p className="text-[11px] text-stone-400 mt-2 leading-relaxed">
              Cách nhanh nhất: bấm <strong>Tải ảnh bìa</strong> → <strong>Copy nội dung</strong> → mở nhóm Facebook/Zalo,
              dán nội dung rồi đính ảnh vừa tải. Facebook không cho điền sẵn caption qua link nên phải dán tay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
