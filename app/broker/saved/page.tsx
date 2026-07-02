'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import ListingImageMosaic from '@/components/ui/ListingImageMosaic';
import { SkeletonCardGrid } from '@/components/ui/Skeleton';

const TYPE_LABEL: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1K1N', '2k1n': '2K1N', studio: 'Studio', duplex: 'Duplex',
};

export default function BrokerSavedPage() {
  const [listings, setListings] = useState<any[] | null>(null);

  const load = () => {
    fetch('/api/saved-listings').then(r => r.ok ? r.json() : null)
      .then(d => setListings(d?.listings || []))
      .catch(() => setListings([]));
  };
  useEffect(() => { load(); }, []);

  const unsave = async (roomTypeId: string) => {
    setListings(prev => (prev || []).filter(l => l.id !== roomTypeId));
    try {
      await fetch(`/api/saved-listings?roomTypeId=${roomTypeId}`, { method: 'DELETE' });
      toast.success('Đã bỏ lưu tin');
    } catch { toast.error('Lỗi, thử lại'); load(); }
  };

  if (listings === null) return <div className="p-8"><SkeletonCardGrid count={6} /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">🔖 Tin đã lưu</h1>
        <p className="text-sm text-stone-500 mt-1">{listings.length} tin bạn đã lưu để xem lại sau</p>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-16 text-stone-400 card">
          <p className="text-4xl mb-3">🔖</p>
          <p>Chưa lưu tin nào. Vào <Link href="/broker/inventory" className="text-brand-600 font-medium hover:underline">Kho hàng</Link> và bấm 🔖 để lưu tin.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((room: any) => {
            const images = [...(room.images || []), ...(room.property?.images || [])];
            return (
              <div key={room.id} className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg transition-all">
                <Link href={`/tin/${room.id}`} className="block relative">
                  <ListingImageMosaic images={images} alt={room.name} className="h-44" />
                  <span className="absolute top-3 left-3 z-10 badge bg-white/90 text-brand-700 text-xs shadow-sm font-semibold backdrop-blur-sm">
                    {TYPE_LABEL[room.typeName] || room.typeName}
                  </span>
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/tin/${room.id}`} className="min-w-0">
                      <h3 className="font-display font-semibold text-base text-stone-900 line-clamp-1 group-hover:text-brand-600 transition-colors">{room.name}</h3>
                    </Link>
                    <button onClick={() => unsave(room.id)} title="Bỏ lưu"
                      className="shrink-0 w-8 h-8 rounded-lg bg-amber-400 text-white flex items-center justify-center hover:bg-amber-500 transition-colors">🔖</button>
                  </div>
                  <p className="text-sm text-stone-500 mt-0.5 line-clamp-1">
                    {room.property?.name}{room.property?.district ? ` • ${room.property.district}` : ''}
                  </p>
                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <span className="text-lg font-bold text-brand-600">{formatCurrency(room.priceMonthly)}<span className="text-xs font-normal text-stone-400">/tháng</span></span>
                    <span className="text-xs text-stone-500">{room.areaSqm}m²</span>
                  </div>
                  {room.listingCode && <p className="text-[10px] font-mono text-stone-400 mt-1">Mã: {room.listingCode}</p>}
                  <Link href={`/tin/${room.id}`} className="mt-3 block text-center text-xs font-medium text-brand-600 hover:underline">Xem chi tiết →</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
