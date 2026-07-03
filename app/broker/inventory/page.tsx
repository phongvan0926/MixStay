'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';
import OptimizedImage from '@/components/ui/OptimizedImage';
import VideoGallery from '@/components/ui/VideoGallery';
import ListingActionBar from '@/components/ui/ListingActionBar';
import { buildListingText } from '@/lib/listing-text';
import { pickVideoCover } from '@/lib/video-utils';
import { useRoomTypes, useCompanies, useDashboardStats } from '@/hooks/useData';
import { SkeletonStats, SkeletonCardGrid } from '@/components/ui/Skeleton';
import DistrictPills from '@/components/ui/DistrictPills';
import PriceRangeSlider from '@/components/ui/PriceRangeSlider';

const roomTypeLabels: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1N1K',
  '2k1n': '2N1K', studio: 'Studio', duplex: 'Duplex',
};
const roomTypeOptions = [
  { value: '', label: 'Tất cả loại' },
  { value: 'studio', label: 'Studio' }, { value: 'gac_xep', label: 'Gác xép' },
  { value: 'don', label: 'Phòng đơn' }, { value: '1k1n', label: '1N1K' },
  { value: '2k1n', label: '2N1K' }, { value: 'duplex', label: 'Duplex' },
];

function parseCommission(json: string | null): Record<string, number> {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

function formatCommissionLine(commission: Record<string, number>, price: number): string {
  return Object.entries(commission)
    .map(([m, p]) => `${m}th=${p}% (${formatCurrency(price * Number(p) / 100)})`)
    .join(' | ');
}

// Zalo/hotline admin cố định để CTV (chưa được cấp quyền xem liên hệ) gửi thông tin phòng cần hỗ trợ.
const SUPPORT_ZALO = process.env.NEXT_PUBLIC_SUPPORT_ZALO || 'https://zalo.me/0379838222';
function sendSupportRequest(room: any) {
  const code = room.listingCode ? `[${room.listingCode}] ` : '';
  const msg = `Cần hỗ trợ tin: ${code}${room.name || ''}${room.property?.district ? ' - ' + room.property.district : ''}`;
  try { navigator.clipboard.writeText(msg); } catch {}
  window.open(SUPPORT_ZALO, '_blank', 'noopener');
  toast.success('Đã sao chép thông tin tin đăng — dán vào Zalo admin để nhờ hỗ trợ');
}

// Khối "gửi hỗ trợ qua Zalo admin" hiện khi CTV chưa được cấp quyền xem liên hệ.
function SupportContactBlock({ room }: { room: any }) {
  return (
    <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
      <p className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-1">🔒 Liên hệ do công ty quản lý</p>
      <p className="text-xs text-stone-600 mb-2">Bạn chưa được cấp quyền xem liên hệ chủ nhà/công ty. Gửi thông tin phòng cần hỗ trợ về Zalo admin để được kết nối.</p>
      <button type="button" onClick={(e) => { e.stopPropagation(); sendSupportRequest(room); }}
        className="inline-flex items-center gap-1.5 bg-violet-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-violet-700 transition-colors font-medium">
        💬 Gửi hỗ trợ qua Zalo admin
      </button>
    </div>
  );
}

function RoomImageCarousel({ room }: { room: any }) {
  const roomImages: string[] = room.images || [];
  const propImages: string[] = room.property?.images || [];
  const allImages = [...roomImages, ...propImages];
  const show = allImages.slice(0, 3);
  const [imgIdx, setImgIdx] = useState(0);

  if (show.length === 0) {
    // Không có ảnh → dùng video làm ảnh đại diện cho đỡ trống.
    const cover = pickVideoCover(room.videos, room.videoLinks);
    if (cover) {
      return (
        <div className="h-48 rounded-xl overflow-hidden relative bg-stone-900">
          {cover.kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.src} alt="Ảnh phòng" className="w-full h-full object-cover" loading="lazy" />
          ) : cover.kind === 'video' ? (
            <video src={`${cover.src}#t=0.5`} preload="metadata" muted playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-700 to-brand-900" />
          )}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-12 h-12 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center text-white text-lg shadow-lg">▶</span>
          </div>
          <span className="absolute bottom-2 right-2 bg-black/55 text-white text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">🎬 Video</span>
        </div>
      );
    }
    return (
      <div className="h-48 bg-gradient-to-br from-brand-100 to-brand-50 rounded-xl flex items-center justify-center">
        <span className="text-4xl">🏢</span>
      </div>
    );
  }

  return (
    <div className="h-48 rounded-xl overflow-hidden relative group">
      <OptimizedImage
        src={show[imgIdx]}
        alt="Ảnh phòng"
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
      />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
      {/* Image count badge */}
      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
        📷 {allImages.length}
      </span>
      {/* Dots indicator */}
      {show.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {show.map((_, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white w-3' : 'bg-white/50'}`} />
          ))}
        </div>
      )}
      {/* Navigation arrows */}
      {show.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setImgIdx(i => (i - 1 + show.length) % show.length); }}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 text-sm"
          >‹</button>
          <button
            onClick={(e) => { e.stopPropagation(); setImgIdx(i => (i + 1) % show.length); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 text-sm"
          >›</button>
        </>
      )}
    </div>
  );
}

// ==================== Room Detail Modal (broker view) ====================
function RoomDetailModal({
  room, onClose, onCreateLink, onSendInquiry, copied, asked, canViewContact, canViewCommission, saved, onToggleSave,
}: {
  room: any;
  onClose: () => void;
  onCreateLink: (id: string) => void;
  onSendInquiry: (id: string) => void;
  copied: boolean;
  asked: boolean;
  canViewContact: boolean;
  canViewCommission: boolean;
  saved: boolean;
  onToggleSave: () => void;
}) {
  // Nội dung + link để copy/chia sẻ (dùng địa chỉ CÔNG KHAI, không lộ số nhà khi đăng lại).
  const modalShareUrl = `/tin/${room.id}`;
  const modalCopyText = buildListingText({
    name: room.name, typeName: room.typeName, areaSqm: room.areaSqm,
    priceMonthly: room.priceMonthly, deposit: room.deposit, listingCode: room.listingCode,
    location: [room.property?.streetName, room.property?.district].filter(Boolean).join(', '),
    amenities: room.amenities, buildingAmenities: room.property?.amenities,
    description: room.description,
    url: (typeof window !== 'undefined' ? window.location.origin : '') + modalShareUrl,
  });
  const roomImages: string[] = room.images || [];
  const propImages: string[] = room.property?.images || [];
  const allImages = [...roomImages, ...propImages];
  const videos: string[] = room.videos || [];
  const videoLinks: string[] = room.videoLinks || [];

  const commission = parseCommission(room.commissionJson);
  const hasCommission = Object.keys(commission).length > 0;
  const zaloPhone = room.property?.zaloPhone || room.property?.landlord?.phone;
  const zaloLink = zaloPhone ? 'https://zalo.me/' + zaloPhone.replace(/\s/g, '') : null;
  const company = room.property?.company;
  const landlord = room.property?.landlord;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto mx-0 sm:mx-4 z-10">
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Media */}
        {(allImages.length > 0 || videos.length > 0 || videoLinks.length > 0) && (
          <div className="p-4 sm:p-5 pb-0">
            <VideoGallery images={allImages} videos={videos} videoLinks={videoLinks} />
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Module nhanh: Diện tích / Tổng phòng / Còn trống — ngay dưới ảnh chính (đồng nhất trang chi tiết) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl text-center">
              <p className="text-lg font-bold text-stone-800">{room.areaSqm} m²</p>
              <p className="text-[11px] text-stone-500 mt-0.5">Diện tích</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl text-center">
              <p className="text-lg font-bold text-stone-800">{room.totalUnits}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">Tổng phòng</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl text-center">
              <p className={'text-lg font-bold ' + (room.availableUnits > 0 ? 'text-emerald-600' : 'text-red-600')}>
                {room.availableUnits}
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">Còn trống</p>
            </div>
          </div>

          {/* Title + type */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold text-stone-900">{room.name}</h2>
              <p className="text-sm text-stone-500 mt-0.5">{room.property?.name} • {room.areaSqm}m²</p>
              {room.listingCode && (
                <p className="text-[11px] font-mono font-semibold text-stone-400 mt-1">Mã: {room.listingCode}</p>
              )}
            </div>
            {room.typeName && (
              <span className="badge bg-brand-100 text-brand-700 shrink-0">
                {roomTypeLabels[room.typeName] || room.typeName}
              </span>
            )}
          </div>

          {/* Price */}
          <div>
            <div className="text-3xl font-bold text-brand-600">
              {formatCurrency(room.priceMonthly)}
              <span className="text-base font-normal text-stone-400">/tháng</span>
            </div>
            {room.deposit > 0 && (
              <p className="text-sm text-stone-500 mt-1">
                Cọc: <span className="font-semibold text-amber-600">{formatCurrency(room.deposit)}</span>
              </p>
            )}
          </div>

          {/* Short-term */}
          {room.shortTermAllowed && (
            <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
              <p className="text-sm text-violet-700 font-medium">📅 Cho thuê ngắn hạn</p>
              <p className="text-xs text-violet-600 mt-0.5">
                {room.shortTermMonths && <>Từ {room.shortTermMonths} tháng</>}
                {room.shortTermPrice && <> — Giá {formatCurrency(room.shortTermPrice)}/tháng</>}
              </p>
            </div>
          )}

          {room.availableRoomNames && (
            <p className="text-sm text-stone-500">
              Phòng trống: <span className="font-medium text-stone-700">{room.availableRoomNames}</span>
            </p>
          )}

          {/* Description */}
          {room.description && (
            <div className="p-3 bg-stone-50 rounded-xl">
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{room.description}</p>
            </div>
          )}

          {/* Commission — chỉ CTV được cấp quyền xem hoa hồng */}
          {canViewCommission && hasCommission && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">💰 Hoa hồng</p>
              <p className="text-sm text-emerald-800 font-medium break-words">
                {formatCommissionLine(commission, room.priceMonthly)}
              </p>
            </div>
          )}

          {/* Landlord notes */}
          {(room.landlordNotes || room.property?.landlordNotes) && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">📝 Lưu ý chủ nhà</p>
              <p className="text-sm text-amber-800 whitespace-pre-line">{room.landlordNotes || room.property?.landlordNotes}</p>
            </div>
          )}

          {/* Room amenities */}
          {room.amenities?.length > 0 && (
            <div>
              <p className="text-sm font-bold text-stone-700 mb-2">🛋️ Nội thất</p>
              <div className="flex flex-wrap gap-2">
                {room.amenities.map((a: string) => (
                  <span key={a} className="px-3 py-1.5 bg-brand-50 text-brand-700 text-sm rounded-lg border border-brand-100 font-medium">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Property amenities */}
          {room.property?.amenities?.length > 0 && (
            <div>
              <p className="text-sm font-bold text-stone-700 mb-2">🏢 Tiện ích tòa nhà</p>
              <div className="flex flex-wrap gap-2">
                {room.property.amenities.map((a: string) => (
                  <span key={a} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200 font-medium">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Property special features */}
          {(room.property?.parkingCar || room.property?.parkingBike || room.property?.evCharging ||
            room.property?.petAllowed || room.property?.foreignerOk) && (
            <div className="flex flex-wrap gap-2">
              {room.property?.parkingCar && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg font-medium">🚗 Ô tô đỗ cửa</span>}
              {room.property?.parkingBike && <span className="text-xs bg-sky-50 text-sky-700 border border-sky-100 px-2.5 py-1 rounded-lg font-medium">🏍️ Để xe máy</span>}
              {room.property?.evCharging && <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-lg font-medium">⚡ Sạc xe điện</span>}
              {room.property?.petAllowed && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-lg font-medium">🐾 Thú cưng OK</span>}
              {room.property?.foreignerOk && <span className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-lg font-medium">🌍 Người nước ngoài</span>}
            </div>
          )}

          {/* Liên hệ chủ nhà/công ty — chỉ CTV được cấp quyền; ngược lại hiện nút gửi hỗ trợ Zalo admin */}
          {canViewContact ? (
            <>
              {/* Full address */}
              {room.property?.fullAddress && (
                <div className="p-3 bg-stone-50 rounded-xl">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">📍 Địa chỉ đầy đủ</p>
                  <p className="text-sm text-stone-800 font-medium">{room.property.fullAddress}</p>
                  {(room.property?.district || room.property?.streetName) && (
                    <p className="text-xs text-stone-500 mt-1">
                      {[room.property?.streetName, room.property?.district].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>
              )}

              {/* Landlord contact */}
              {landlord && (
                <div className="p-3 bg-brand-50 rounded-xl border border-brand-100">
                  <p className="text-xs font-bold text-brand-700 uppercase tracking-wide mb-1.5">👤 Chủ nhà</p>
                  <p className="text-sm font-medium text-stone-800">{landlord.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {landlord.phone && (
                      <a href={'tel:' + landlord.phone}
                        className="inline-flex items-center gap-1 bg-white border border-stone-200 text-stone-700 text-sm px-3 py-1.5 rounded-lg hover:border-brand-300 transition-colors">
                        📞 {landlord.phone}
                      </a>
                    )}
                    {room.property?.zaloPhone && room.property.zaloPhone !== landlord.phone && (
                      <a href={'tel:' + room.property.zaloPhone}
                        className="inline-flex items-center gap-1 bg-white border border-stone-200 text-stone-700 text-sm px-3 py-1.5 rounded-lg hover:border-brand-300 transition-colors">
                        📞 Zalo: {room.property.zaloPhone}
                      </a>
                    )}
                    {zaloLink && (
                      <a href={zaloLink} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                        💬 Chat Zalo
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Zalo group */}
              {company?.zaloGroupLink && (
                <a href={company.zaloGroupLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  💬 Zalo nhóm {company.name}
                </a>
              )}
            </>
          ) : (
            <SupportContactBlock room={room} />
          )}

          {/* Công cụ bài đăng: tải ảnh / copy nội dung / chia sẻ ra ngoài */}
          <div className="pt-3 border-t border-stone-100">
            <ListingActionBar
              images={[...(room.images || []), ...(room.property?.images || [])]}
              shareUrl={modalShareUrl}
              copyText={modalCopyText}
              title={room.name}
              fileBase={`anh-${room.listingCode || room.id}`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-stone-100">
            <button onClick={onToggleSave}
              title={saved ? 'Bỏ lưu tin' : 'Lưu tin để xem lại sau'}
              className={'py-3 px-4 rounded-xl font-medium text-sm transition-all border ' +
                (saved ? 'bg-amber-400 border-amber-400 text-white' : 'bg-white border-stone-200 text-stone-600 hover:border-amber-300')}>
              {saved ? '🔖 Đã lưu' : '🔖 Lưu tin'}
            </button>
            <button onClick={() => onCreateLink(room.id)}
              className={'flex-1 py-3 rounded-xl font-medium text-sm transition-all ' +
                (copied ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-600 text-white hover:bg-brand-700')}>
              {copied ? '✓ Đã copy link' : '🔗 Tạo link khách'}
            </button>
            <button onClick={() => onSendInquiry(room.id)}
              disabled={asked}
              className={'flex-1 py-3 rounded-xl font-medium text-sm transition-all border ' +
                (asked ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100')}>
              {asked ? '✓ Đã hỏi chủ nhà' : '❓ Còn phòng?'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BrokerInventoryPage() {
  const { data: session } = useSession();
  // Quyền CTV: mặc định ẩn liên hệ + hoa hồng cho tới khi admin cấp.
  const canViewContact = !!(session?.user as any)?.canViewContact;
  const canViewCommission = !!(session?.user as any)?.canViewCommission;

  // Tin đã lưu (bookmark) của CTV.
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch('/api/saved-listings').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.savedIds) setSavedSet(new Set(d.savedIds)); }).catch(() => {});
  }, []);
  const toggleSave = async (roomTypeId: string) => {
    const isSaved = savedSet.has(roomTypeId);
    setSavedSet(prev => { const n = new Set(prev); isSaved ? n.delete(roomTypeId) : n.add(roomTypeId); return n; });
    try {
      if (isSaved) await fetch(`/api/saved-listings?roomTypeId=${roomTypeId}`, { method: 'DELETE' });
      else await fetch('/api/saved-listings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomTypeId }) });
      toast.success(isSaved ? 'Đã bỏ lưu tin' : '🔖 Đã lưu tin');
    } catch {
      setSavedSet(prev => { const n = new Set(prev); isSaved ? n.add(roomTypeId) : n.delete(roomTypeId); return n; });
      toast.error('Lỗi, thử lại');
    }
  };

  const [page, setPage] = useState(1);
  const [copiedLink, setCopiedLink] = useState('');
  const [inquirySent, setInquirySent] = useState<Set<string>>(new Set());
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [filter, setFilter] = useState({
    search: '', companyId: '', roomType: '', district: [] as string[], minPrice: '', maxPrice: '',
    parkingCar: false, foreignerOk: false, evCharging: false, petAllowed: false,
    shortTerm: false, status: 'available' as 'available' | 'all',
  });
  // Pending price range — slider chỉ update local, đợi user bấm "Lọc" mới apply
  const [pendingPrice, setPendingPrice] = useState({ min: '', max: '' });
  const priceDirty = pendingPrice.min !== filter.minPrice || pendingPrice.max !== filter.maxPrice;

  // Build SWR params from filter
  const swrParams: Record<string, string> = { page: String(page), limit: '20' };
  if (filter.status === 'available') swrParams.available = 'true';
  if (filter.companyId) swrParams.companyId = filter.companyId;
  if (filter.district.length) swrParams.district = filter.district.join(',');
  if (filter.minPrice) swrParams.minPrice = filter.minPrice;
  if (filter.maxPrice) swrParams.maxPrice = filter.maxPrice;
  if (filter.search) swrParams.search = filter.search;
  if (filter.roomType) swrParams.roomType = filter.roomType;
  if (filter.parkingCar) swrParams.parkingCar = 'true';
  if (filter.foreignerOk) swrParams.foreignerOk = 'true';
  if (filter.evCharging) swrParams.evCharging = 'true';
  if (filter.petAllowed) swrParams.petAllowed = 'true';
  if (filter.shortTerm) swrParams.shortTerm = 'true';

  const { roomTypes: rooms, pagination, isLoading: loading, mutate } = useRoomTypes(swrParams);
  const { stats } = useDashboardStats();
  const { companies } = useCompanies();

  const handleFilter = () => {
    // Apply pending price range vào filter chính (trigger SWR re-fetch)
    setFilter(prev => ({ ...prev, minPrice: pendingPrice.min, maxPrice: pendingPrice.max }));
    setPage(1);
  };

  const toggleFilter = (key: string, value: any) => {
    setFilter(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handlePageChange = (newPage: number) => { setPage(newPage); };

  const createShareLink = async (roomTypeId: string) => {
    const res = await fetch('/api/share-links', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomTypeId }),
    });
    const data = await res.json();
    if (res.ok) {
      await navigator.clipboard.writeText(data.url);
      setCopiedLink(roomTypeId);
      toast.success('Đã tạo & copy link!');
      setTimeout(() => setCopiedLink(''), 3000);
    }
  };

  // Share TOÀN BỘ kho hàng đang trống — link kho của cộng tác viên, khách chỉ thấy liên hệ của tôi
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
      } else {
        toast.error(data.error || 'Không tạo được link');
      }
    } finally { setSharingSystem(false); }
  };

  const sendInquiry = async (roomTypeId: string) => {
    const res = await fetch('/api/inquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomTypeId, message: 'Còn phòng không?' }),
    });
    if (res.ok) {
      setInquirySent(prev => new Set(prev).add(roomTypeId));
      toast.success('Đã gửi hỏi chủ nhà!');
    }
  };

  if (loading) return <div className="p-8"><SkeletonStats count={4} /><div className="mt-6"><SkeletonCardGrid count={6} /></div></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Kho hàng</h1>
          <p className="text-sm text-stone-500 mt-1">{rooms.length} tin đăng</p>
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

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Tổng deal', value: stats.totalDeals, icon: '📊', color: '' },
            { label: 'Đã chốt', value: stats.confirmedDeals, icon: '✅', color: 'text-emerald-600' },
            // Ô "Hoa hồng" chỉ hiện khi CTV được cấp quyền xem hoa hồng.
            ...(canViewCommission ? [{ label: 'Hoa hồng', value: formatCurrency(stats.totalCommission), icon: '💰', color: 'text-brand-600' }] : []),
            { label: 'Lượt xem', value: stats.totalViews, icon: '👁️', color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.icon}</span>
                <p className="text-xs font-medium text-stone-500 uppercase">{s.label}</p>
              </div>
              <p className={'text-lg sm:text-xl font-bold mt-1 truncate ' + s.color}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* === FILTERS === */}
      <div className="card mb-6">
        {/* Row 1: Search + Company + Room kind */}
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-stone-500 mb-1">Tìm kiếm thông minh</label>
            <input className="input-field" placeholder="Mã tin (MS-...), tên phòng, địa chỉ, SĐT..." value={filter.search}
              onChange={e => setFilter({ ...filter, search: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleFilter()} />
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-xs font-medium text-stone-500 mb-1">Hệ thống/Công ty</label>
            <select className="input-field" value={filter.companyId}
              onChange={e => { setFilter({ ...filter, companyId: e.target.value }); }}>
              <option value="">Tất cả</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-36">
            <label className="block text-xs font-medium text-stone-500 mb-1">Kiểu phòng</label>
            <select className="input-field" value={filter.roomType}
              onChange={e => setFilter({ ...filter, roomType: e.target.value })}>
              {roomTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button onClick={handleFilter} className="btn-primary">Lọc</button>
        </div>

        {/* Row 2: Quận pills */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-stone-500 mb-2">Khu vực</label>
          <DistrictPills value={filter.district} onChange={d => { setFilter(prev => ({ ...prev, district: d })); setPage(1); }} />
        </div>

        {/* Row 3: Khoảng giá - dual range slider (kéo → pending, bấm "Lọc" để apply) */}
        <div className="mb-4 max-w-md">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-stone-500">Khoảng giá thuê</label>
            {priceDirty && (
              <span className="text-[11px] font-medium text-amber-600">⚠️ Chưa áp dụng — bấm Lọc</span>
            )}
          </div>
          <PriceRangeSlider
            minValue={pendingPrice.min}
            maxValue={pendingPrice.max}
            onChange={setPendingPrice}
          />
        </div>

        {/* Row 2: Toggle tags */}
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'parkingCar', label: '🚗 Ô tô' },
            { key: 'foreignerOk', label: '🌍 Foreigner' },
            { key: 'evCharging', label: '⚡ Sạc xe' },
            { key: 'petAllowed', label: '🐾 Pet' },
            { key: 'shortTerm', label: '📅 Ngắn hạn' },
          ] as const).map(f => (
            <button key={f.key}
              onClick={() => toggleFilter(f.key, !(filter as any)[f.key])}
              className={'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ' +
                ((filter as any)[f.key]
                  ? 'bg-brand-50 border-brand-200 text-brand-700'
                  : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300')}>
              {f.label}
            </button>
          ))}
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => toggleFilter('status', 'available')}
              className={'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ' +
                (filter.status === 'available'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300')}>
              Còn phòng
            </button>
            <button
              onClick={() => toggleFilter('status', 'all')}
              className={'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ' +
                (filter.status === 'all'
                  ? 'bg-brand-50 border-brand-200 text-brand-700'
                  : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300')}>
              Tất cả
            </button>
          </div>
        </div>
      </div>

      {/* === ROOM CARDS === */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {rooms.map((room: any) => {
          const commission = parseCommission(room.commissionJson);
          const hasCommission = Object.keys(commission).length > 0;
          const zaloPhone = room.property?.zaloPhone || room.property?.landlord?.phone;
          const zaloLink = zaloPhone ? 'https://zalo.me/' + zaloPhone.replace(/\s/g, '') : null;
          const company = room.property?.company;

          return (
            <div key={room.id} className="card-hover group overflow-hidden cursor-pointer"
              onClick={() => setSelectedRoom(room)}>
              {/* Image carousel */}
              <div className="relative -mx-4 -mt-4 mb-3 sm:-mx-5 sm:-mt-5">
                <RoomImageCarousel room={room} />
                {/* Room type badge */}
                {room.typeName && (
                  <span className="absolute top-3 left-3 badge bg-white/90 text-brand-700 text-xs shadow-sm font-semibold backdrop-blur-sm">
                    {roomTypeLabels[room.typeName] || room.typeName}
                  </span>
                )}
                {/* Short-term badge */}
                {room.shortTermAllowed && (
                  <span className="absolute top-3 right-3 badge bg-violet-500/90 text-white text-[10px] shadow-sm backdrop-blur-sm">
                    📅 Ngắn hạn{room.shortTermMonths ? `: từ ${room.shortTermMonths} tháng` : ''}
                  </span>
                )}
              </div>

              {/* Title + type */}
              <div className="mb-1">
                <h3 className="font-semibold text-stone-900 text-[15px]">{room.name}</h3>
                <p className="text-sm text-stone-500">
                  {room.property?.name} • {room.areaSqm}m²
                </p>
                {room.listingCode && (
                  <p className="text-[10px] font-mono font-semibold text-stone-400 mt-0.5">Mã: {room.listingCode}</p>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-xl font-bold text-brand-600">
                  {formatCurrency(room.priceMonthly)}<span className="text-sm font-normal text-stone-400">/tháng</span>
                </p>
                {room.shortTermAllowed && room.shortTermPrice && (
                  <span className="text-xs text-violet-600 font-medium">
                    Ngắn hạn: {formatCurrency(room.shortTermPrice)}
                  </span>
                )}
              </div>

              {/* Deposit */}
              {room.deposit > 0 && (
                <p className="text-xs text-amber-600 font-medium mb-2">Cọc: {formatCurrency(room.deposit)}</p>
              )}

              {/* Available units */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  room.availableUnits > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                }`}>
                  Còn {room.availableUnits}/{room.totalUnits} phòng
                </span>
                {room.availableRoomNames && (
                  <span className="text-[11px] text-stone-500 truncate">{room.availableRoomNames}</span>
                )}
              </div>

              {/* Commission — chỉ CTV được cấp quyền xem hoa hồng */}
              {canViewCommission && hasCommission && (
                <div className="p-2.5 bg-emerald-50 rounded-lg mb-2 border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-700">
                    💰 HH: {formatCommissionLine(commission, room.priceMonthly)}
                  </p>
                </div>
              )}

              {/* Zalo nhóm công ty — chỉ khi được quyền xem liên hệ */}
              {canViewContact && company?.zaloGroupLink && (
                <a href={company.zaloGroupLink} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                  💬 Zalo nhóm {company.name}
                </a>
              )}

              {/* Property-level special amenities */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {room.property?.parkingCar && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🚗 Ô tô đỗ cửa</span>}
                {room.property?.parkingBike && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🏍️ Để xe máy</span>}
                {room.property?.evCharging && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">⚡ Sạc xe điện</span>}
                {room.property?.petAllowed && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🐾 Thú cưng OK</span>}
                {room.property?.foreignerOk && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🌍 Người nước ngoài</span>}
              </div>

              {/* Landlord notes */}
              {(room.landlordNotes || room.property?.landlordNotes) && (
                <div className="p-2 bg-amber-50 rounded-lg mb-2 border border-amber-100">
                  <p className="text-[10px] font-semibold text-amber-700 mb-0.5">📝 LƯU Ý</p>
                  <p className="text-xs text-amber-800">{room.landlordNotes || room.property?.landlordNotes}</p>
                </div>
              )}

              {/* Liên hệ chủ nhà — chỉ CTV được cấp quyền; ngược lại nút gửi hỗ trợ Zalo admin */}
              {canViewContact ? (
                <>
                  {room.property?.fullAddress && (
                    <p className="text-xs text-stone-500 mb-2">📍 {room.property.fullAddress}</p>
                  )}
                  {room.property?.landlord && (
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs text-stone-600">👤 {room.property.landlord.name}</span>
                      {room.property.landlord.phone && (
                        <a href={'tel:' + room.property.landlord.phone}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-brand-600 hover:underline">
                          📞 {room.property.landlord.phone}
                        </a>
                      )}
                      {zaloLink && (
                        <a href={zaloLink} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 font-medium">Zalo</a>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <button type="button" onClick={(e) => { e.stopPropagation(); sendSupportRequest(room); }}
                  className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors">
                  💬 Gửi hỗ trợ qua Zalo admin
                </button>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-stone-100">
                <button onClick={(e) => { e.stopPropagation(); toggleSave(room.id); }}
                  title={savedSet.has(room.id) ? 'Bỏ lưu tin' : 'Lưu tin để xem lại sau'}
                  className={'text-xs py-2 px-2.5 rounded-lg font-medium transition-all border ' +
                    (savedSet.has(room.id) ? 'bg-amber-400 border-amber-400 text-white' : 'bg-white border-stone-200 text-stone-500 hover:border-amber-300')}>
                  🔖
                </button>
                <button onClick={(e) => { e.stopPropagation(); createShareLink(room.id); }}
                  className={'flex-1 text-xs py-2 rounded-lg font-medium transition-all ' +
                    (copiedLink === room.id ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-50 text-brand-700 hover:bg-brand-100')}>
                  {copiedLink === room.id ? '✓ Copied' : '🔗 Tạo link khách'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); sendInquiry(room.id); }}
                  disabled={inquirySent.has(room.id)}
                  className={'flex-1 text-xs py-2 rounded-lg font-medium transition-all ' +
                    (inquirySent.has(room.id) ? 'bg-amber-100 text-amber-700' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200')}>
                  {inquirySent.has(room.id) ? '✓ Đã hỏi' : '❓ Còn phòng?'}
                </button>
              </div>
            </div>
          );
        })}
        {rooms.length === 0 && (
          <div className="md:col-span-3 text-center py-16 text-stone-400">
            <p className="text-4xl mb-3">📦</p><p>Không tìm thấy phòng phù hợp</p>
          </div>
        )}
      </div>

      {pagination && (
        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={handlePageChange} />
      )}

      {/* Room detail modal */}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onCreateLink={createShareLink}
          onSendInquiry={sendInquiry}
          copied={copiedLink === selectedRoom.id}
          asked={inquirySent.has(selectedRoom.id)}
          canViewContact={canViewContact}
          canViewCommission={canViewCommission}
          saved={savedSet.has(selectedRoom.id)}
          onToggleSave={() => toggleSave(selectedRoom.id)}
        />
      )}
    </div>
  );
}
