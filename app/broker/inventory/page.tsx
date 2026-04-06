'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

const roomTypeLabels: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1K1N',
  '2k1n': '2K1N', studio: 'Studio', duplex: 'Duplex',
};
const roomTypeOptions = [
  { value: '', label: 'Tất cả loại' },
  { value: 'don', label: 'Phòng đơn' }, { value: 'gac_xep', label: 'Gác xép' },
  { value: '1k1n', label: '1K1N' }, { value: '2k1n', label: '2K1N' },
  { value: 'studio', label: 'Studio' }, { value: 'duplex', label: 'Duplex' },
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

function RoomImageCarousel({ room }: { room: any }) {
  const roomImages: string[] = room.images || [];
  const propImages: string[] = room.property?.images || [];
  const allImages = [...roomImages, ...propImages];
  const show = allImages.slice(0, 3);
  const [imgIdx, setImgIdx] = useState(0);

  if (show.length === 0) {
    return (
      <div className="h-48 bg-gradient-to-br from-brand-100 to-brand-50 rounded-xl flex items-center justify-center">
        <span className="text-4xl">🏢</span>
      </div>
    );
  }

  return (
    <div className="h-48 rounded-xl overflow-hidden relative group">
      <img
        src={show[imgIdx]}
        alt="Ảnh phòng"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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

export default function BrokerInventoryPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState('');
  const [inquirySent, setInquirySent] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState({
    search: '', companyId: '', roomType: '', minPrice: '', maxPrice: '',
    parkingCar: false, foreignerOk: false, evCharging: false, petAllowed: false,
    shortTerm: false, status: 'available' as 'available' | 'all',
  });

  const fetchData = async () => {
    const params = new URLSearchParams();
    if (filter.status === 'available') params.set('available', 'true');
    if (filter.companyId) params.set('companyId', filter.companyId);
    if (filter.minPrice) params.set('minPrice', filter.minPrice);
    if (filter.maxPrice) params.set('maxPrice', filter.maxPrice);
    if (filter.search) params.set('search', filter.search);
    if (filter.roomType) params.set('roomType', filter.roomType);
    if (filter.parkingCar) params.set('parkingCar', 'true');
    if (filter.foreignerOk) params.set('foreignerOk', 'true');
    if (filter.evCharging) params.set('evCharging', 'true');
    if (filter.petAllowed) params.set('petAllowed', 'true');
    if (filter.shortTerm) params.set('shortTerm', 'true');

    const [roomsRes, statsRes, companiesRes] = await Promise.all([
      fetch('/api/rooms?' + params),
      fetch('/api/dashboard-stats'),
      fetch('/api/companies'),
    ]);
    const roomsData = await roomsRes.json();
    const companiesData = await companiesRes.json();
    setRooms(Array.isArray(roomsData) ? roomsData : []);
    setCompanies(Array.isArray(companiesData) ? companiesData : []);
    setStats(await statsRes.json());
    setLoading(false);
  };

  const [filterTrigger, setFilterTrigger] = useState(0);
  useEffect(() => { fetchData(); }, [filterTrigger]);
  const handleFilter = () => { setLoading(true); setFilterTrigger(t => t + 1); };

  const toggleFilter = (key: string, value: any) => {
    setFilter(prev => {
      const next = { ...prev, [key]: value };
      // Use setTimeout to trigger fetch after state update
      setTimeout(() => { setLoading(true); setFilterTrigger(t => t + 1); }, 0);
      return next;
    });
  };

  const createShareLink = async (roomId: string) => {
    const res = await fetch('/api/share-links', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId }),
    });
    const data = await res.json();
    if (res.ok) {
      await navigator.clipboard.writeText(data.url);
      setCopiedLink(roomId);
      toast.success('Đã tạo & copy link!');
      setTimeout(() => setCopiedLink(''), 3000);
    }
  };

  const sendInquiry = async (roomId: string) => {
    const res = await fetch('/api/inquiries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, message: 'Còn phòng không?' }),
    });
    if (res.ok) {
      setInquirySent(prev => new Set(prev).add(roomId));
      toast.success('Đã gửi hỏi chủ nhà!');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-2">Kho hàng</h1>
      <p className="text-sm text-stone-500 mb-6">{rooms.length} loại phòng</p>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Tổng deal', value: stats.totalDeals, icon: '📊', color: '' },
            { label: 'Đã chốt', value: stats.confirmedDeals, icon: '✅', color: 'text-emerald-600' },
            { label: 'Hoa hồng', value: formatCurrency(stats.totalCommission), icon: '💰', color: 'text-brand-600' },
            { label: 'Lượt xem', value: stats.totalViews, icon: '👁️', color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.icon}</span>
                <p className="text-xs font-medium text-stone-500 uppercase">{s.label}</p>
              </div>
              <p className={'text-xl font-bold mt-1 ' + s.color}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* === FILTERS === */}
      <div className="card mb-6">
        {/* Row 1: Search + Company + Room type + Price */}
        <div className="flex flex-wrap gap-3 items-end mb-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-stone-500 mb-1">Tìm kiếm thông minh</label>
            <input className="input-field" placeholder="Tên phòng, địa chỉ, SĐT, mô tả..." value={filter.search}
              onChange={e => setFilter({ ...filter, search: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleFilter()} />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-stone-500 mb-1">Hệ thống/Công ty</label>
            <select className="input-field" value={filter.companyId}
              onChange={e => { setFilter({ ...filter, companyId: e.target.value }); }}>
              <option value="">Tất cả</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-stone-500 mb-1">Loại phòng</label>
            <select className="input-field" value={filter.roomType}
              onChange={e => setFilter({ ...filter, roomType: e.target.value })}>
              {roomTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-stone-500 mb-1">Giá từ</label>
            <input type="number" className="input-field" placeholder="2000000" value={filter.minPrice}
              onChange={e => setFilter({ ...filter, minPrice: e.target.value })} />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-stone-500 mb-1">Giá đến</label>
            <input type="number" className="input-field" placeholder="5000000" value={filter.maxPrice}
              onChange={e => setFilter({ ...filter, maxPrice: e.target.value })} />
          </div>
          <button onClick={handleFilter} className="btn-primary">Lọc</button>
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
            <div key={room.id} className="card-hover group overflow-hidden">
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

              {/* Commission - prominent display */}
              {hasCommission && (
                <div className="p-2.5 bg-emerald-50 rounded-lg mb-2 border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-700">
                    💰 HH: {formatCommissionLine(commission, room.priceMonthly)}
                  </p>
                </div>
              )}

              {/* Zalo group link */}
              {company?.zaloGroupLink && (
                <a href={company.zaloGroupLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                  💬 Zalo nhóm {company.name}
                </a>
              )}

              {/* Special amenity icons */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {room.property?.parkingCar && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🚗 Ô tô</span>}
                {room.property?.foreignerOk && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🌍 Foreigner</span>}
                {room.property?.evCharging && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">⚡ Sạc EV</span>}
                {room.property?.petAllowed && <span className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">🐾 Pet</span>}
              </div>

              {/* Landlord notes */}
              {(room.landlordNotes || room.property?.landlordNotes) && (
                <div className="p-2 bg-amber-50 rounded-lg mb-2 border border-amber-100">
                  <p className="text-[10px] font-semibold text-amber-700 mb-0.5">📝 LƯU Ý</p>
                  <p className="text-xs text-amber-800">{room.landlordNotes || room.property?.landlordNotes}</p>
                </div>
              )}

              {/* Address (broker only) */}
              {room.property?.fullAddress && (
                <p className="text-xs text-stone-500 mb-2">📍 {room.property.fullAddress}</p>
              )}

              {/* Landlord + Zalo contact */}
              {room.property?.landlord && (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs text-stone-600">👤 {room.property.landlord.name}</span>
                  {room.property.landlord.phone && (
                    <a href={'tel:' + room.property.landlord.phone} className="text-xs text-brand-600 hover:underline">
                      📞 {room.property.landlord.phone}
                    </a>
                  )}
                  {zaloLink && (
                    <a href={zaloLink} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 font-medium">Zalo</a>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-stone-100">
                <button onClick={() => createShareLink(room.id)}
                  className={'flex-1 text-xs py-2 rounded-lg font-medium transition-all ' +
                    (copiedLink === room.id ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-50 text-brand-700 hover:bg-brand-100')}>
                  {copiedLink === room.id ? '✓ Copied' : '🔗 Tạo link khách'}
                </button>
                <button onClick={() => sendInquiry(room.id)}
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
    </div>
  );
}
