'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/lib/utils';
import { useShareLinks } from '@/hooks/useData';
import { SkeletonList } from '@/components/ui/Skeleton';

export default function LandlordShareLinksPage() {
  const { links, isLoading: loading, mutate } = useShareLinks();
  const [creating, setCreating] = useState(false);

  const createSystemLink = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/share-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSystem: true }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Đã tạo link tổng!');
        // Copy to clipboard
        try {
          await navigator.clipboard.writeText(data.url);
          toast.success('Đã copy link vào clipboard!');
        } catch {}
        mutate();
      } else {
        toast.error('Lỗi tạo link');
      }
    } finally {
      setCreating(false);
    }
  };

  const deleteLink = async (id: string) => {
    await fetch(`/api/share-links?id=${id}`, { method: 'DELETE' });
    toast.success('Đã xoá link!');
    mutate();
  };

  const copyLink = async (token: string, isSystem: boolean) => {
    const appUrl = window.location.origin;
    const url = isSystem ? `${appUrl}/share/system/${token}` : `${appUrl}/share/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Đã copy link!');
    } catch {
      toast.error('Không thể copy');
    }
  };

  if (loading) return <div className="p-8"><SkeletonList count={4} /></div>;

  const systemLinks = links.filter(l => l.isSystem);
  const otherLinks = links.filter(l => !l.isSystem);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Link chia sẻ</h1>
          <p className="text-sm text-stone-500 mt-1">Quản lý link chia sẻ kho phòng</p>
        </div>
        <button onClick={createSystemLink} disabled={creating} className="btn-primary w-full sm:w-auto">
          {creating ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Đang tạo...
            </span>
          ) : (
            '+ Tạo link tổng'
          )}
        </button>
      </div>

      {/* Explanation card */}
      <div className="card mb-6 bg-brand-50 border-brand-100">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔗</span>
          <div>
            <p className="font-medium text-brand-800">Link tổng hệ thống</p>
            <p className="text-sm text-brand-600 mt-1">
              Gửi 1 link duy nhất cho MG/khách — họ sẽ thấy <strong>tất cả loại phòng trống</strong> của tất cả tòa nhà bạn quản lý.
              Khách không thấy địa chỉ chi tiết, SĐT hay hoa hồng.
            </p>
          </div>
        </div>
      </div>

      {/* System links */}
      {systemLinks.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-3">Link tổng</h2>
          <div className="space-y-3">
            {systemLinks.map((link: any) => (
              <div key={link.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-lg">🌐</span>
                    <p className="font-medium text-stone-800 truncate">Link tổng kho phòng</p>
                    {link.isActive ? (
                      <span className="badge bg-emerald-100 text-emerald-700 text-[10px]">Hoạt động</span>
                    ) : (
                      <span className="badge bg-stone-100 text-stone-500 text-[10px]">Tắt</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400">
                    Tạo: {formatDateTime(link.createdAt)} • {link.viewCount} lượt xem
                  </p>
                  <p className="text-xs text-brand-600 font-mono mt-1 truncate">
                    /share/system/{link.token}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => copyLink(link.token, true)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-brand-50 text-brand-700 rounded-xl text-sm font-medium hover:bg-brand-100 transition-all border border-brand-200">
                    Copy
                  </button>
                  <button onClick={() => deleteLink(link.id)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-all border border-red-200">
                    Xoá
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other links (if any) */}
      {otherLinks.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">Link riêng lẻ</h2>
          <div className="space-y-3">
            {otherLinks.map((link: any) => (
              <div key={link.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🚪</span>
                    <p className="font-medium text-stone-800 truncate">
                      {link.roomType?.name || 'Loại phòng'}
                    </p>
                  </div>
                  <p className="text-xs text-stone-400">
                    {link.roomType?.property?.name} • {link.viewCount} lượt xem • {formatDateTime(link.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => copyLink(link.token, false)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-brand-50 text-brand-700 rounded-xl text-sm font-medium hover:bg-brand-100 transition-all border border-brand-200">
                    Copy
                  </button>
                  <button onClick={() => deleteLink(link.id)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-all border border-red-200">
                    Xoá
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {links.length === 0 && (
        <div className="text-center py-16 text-stone-400 card">
          <p className="text-4xl mb-3">🔗</p>
          <p>Chưa có link nào. Nhấn <strong>+ Tạo link tổng</strong> để bắt đầu.</p>
        </div>
      )}
    </div>
  );
}
