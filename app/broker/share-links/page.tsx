'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import OptimizedImage from '@/components/ui/OptimizedImage';
import PhoneRequiredNotice from '@/components/ui/PhoneRequiredNotice';
import { useShareLinks } from '@/hooks/useData';
import { SkeletonStats, SkeletonList } from '@/components/ui/Skeleton';

export default function BrokerShareLinksPage() {
  const [page, setPage] = useState(1);
  const router = useRouter();

  const { links, pagination, isLoading: loading, mutate } = useShareLinks({ page: String(page), limit: '20' });

  const handlePageChange = (newPage: number) => { setPage(newPage); };

  const copyLink = async (link: any) => {
    const path = link.isSystem ? `/share/system/${link.token}` : `/share/${link.token}`;
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    toast.success('Đã copy link!');
  };

  const [sharingSystem, setSharingSystem] = useState(false);
  const shareSystem = async () => {
    setSharingSystem(true);
    try {
      const res = await fetch('/api/share-links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSystem: true }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        try { await navigator.clipboard.writeText(data.url); } catch {}
        toast.success('Đã copy link kho hàng! Khách chỉ thấy liên hệ của bạn.');
        mutate();
      } else if (data.code === 'PHONE_REQUIRED') {
        toast.error(data.error);
        router.push('/broker/profile?need=phone');
      } else {
        toast.error(data.error || 'Không tạo được link');
      }
    } finally { setSharingSystem(false); }
  };

  const deleteLink = async (id: string) => {
    if (!confirm('Xoá link này?')) return;
    await fetch(`/api/share-links?id=${id}`, { method: 'DELETE' });
    toast.success('Đã xoá');
    mutate();
  };

  if (loading) return <div className="p-8"><SkeletonStats count={3} /><div className="mt-6"><SkeletonList count={4} /></div></div>;

  const totalViews = links.reduce((s: number, l: any) => s + l.viewCount, 0);
  const activeLinks = links.filter((l: any) => l.isActive).length;

  return (
    <div>
      <PhoneRequiredNotice />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Link chia sẻ</h1>
          <p className="text-sm text-stone-500 mt-1">Quản lý các link đã gửi cho khách</p>
        </div>
        <button onClick={shareSystem} disabled={sharingSystem}
          className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60 w-full sm:w-auto"
          title="Tạo link xem TOÀN BỘ kho hàng đang trống — khách chỉ thấy liên hệ của BẠN">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {sharingSystem ? 'Đang tạo...' : 'Share kho hàng (chỉ liên hệ tôi)'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔗</span>
            <p className="text-xs font-medium text-stone-500 uppercase">Tổng link</p>
          </div>
          <p className="text-xl font-bold mt-1">{links.length}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <span className="text-lg">👁️</span>
            <p className="text-xs font-medium text-stone-500 uppercase">Tổng lượt xem</p>
          </div>
          <p className="text-xl font-bold mt-1 text-brand-600">{totalViews}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <p className="text-xs font-medium text-stone-500 uppercase">Link active</p>
          </div>
          <p className="text-xl font-bold mt-1 text-emerald-600">{activeLinks}</p>
        </div>
      </div>

      <div className="space-y-3">
        {links.map((link: any) => {
          const rt = link.roomType;
          const coverImage = rt?.images?.[0] || rt?.property?.images?.[0];
          const title = link.isSystem
            ? 'Kho phòng tổng (tất cả phòng trống)'
            : (rt ? `${rt.name}${rt.property?.name ? ` — ${rt.property.name}` : ''}` : 'Tin đăng đã xoá');

          return (
            <div key={link.id} className="card-hover">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Room image */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-brand-100 to-brand-50">
                    {coverImage ? (
                      <OptimizedImage src={coverImage} alt="" fill className="object-cover" sizes="64px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🏢</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 truncate">{title}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {rt?.property?.district && <span className="text-xs text-stone-500">{rt.property.district}</span>}
                      {rt?.priceMonthly != null && (
                        <span className="text-xs font-semibold text-brand-600">{formatCurrency(rt.priceMonthly)}</span>
                      )}
                      <span className="text-xs text-stone-400">Tạo: {formatDate(link.createdAt)}</span>
                    </div>
                  </div>

                  {/* View count */}
                  <div className="text-center flex-shrink-0">
                    <p className="text-2xl font-bold text-brand-600">{link.viewCount}</p>
                    <p className="text-[10px] text-stone-500 uppercase font-medium">lượt xem</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => copyLink(link)}
                    className="flex-1 sm:flex-none px-3 py-2 bg-brand-50 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-100 transition-colors">
                    📋 Copy
                  </button>
                  <a href={link.isSystem ? `/share/system/${link.token}` : `/share/${link.token}`} target="_blank"
                    className="flex-1 sm:flex-none px-3 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium hover:bg-stone-200 transition-colors text-center">
                    👁️ Xem
                  </a>
                  <button onClick={() => deleteLink(link.id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {links.length === 0 && (
          <div className="text-center py-16 text-stone-400 card">
            <p className="text-4xl mb-3">🔗</p>
            <p>Chưa có link nào. Vào <strong>Kho hàng</strong> để tạo link.</p>
          </div>
        )}
      </div>

      {pagination && (
        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={handlePageChange} />
      )}
    </div>
  );
}
