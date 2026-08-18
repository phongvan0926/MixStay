'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Combobox from '@/components/ui/Combobox';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { HANOI_DISTRICTS } from '@/lib/hanoi-locations';
import { extractHouseNumber, redactHouseNumber } from '@/lib/address';
import { parseCoords, coordsError, formatCoords, mapPreviewUrl } from '@/lib/coords';

interface PropertyData {
  id?: string;
  name: string;
  description: string;
  houseNumber: string; // số nhà — ẨN với khách (nhập riêng để tách khỏi địa chỉ hiển thị)
  fullAddress: string; // ô "Đường/Ngõ/Ngách" — phần HIỆN cho khách (không gồm số nhà)
  district: string;
  streetName: string;
  city: string;
  latitude: number | null;   // toạ độ ghim trên bản đồ — null = tòa KHÔNG hiện ở /ban-do
  longitude: number | null;
  totalFloors: number | string;
  zaloPhone: string;
  landlordNotes: string;
  amenities: string[];
  images: string[];
  parkingCar: boolean;
  parkingBike: boolean;
  evCharging: boolean;
  petAllowed: boolean;
  foreignerOk: boolean;
  services: { label: string; value: string }[]; // dịch vụ tòa nhà (điện/nước/...): {tên, mức phí}
  status?: string;
}

interface PropertyFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isAdmin?: boolean;
  /** Cho phép đổi chủ nhà khi EDIT (cần permission TRANSFER_PROPERTY_OWNERSHIP). Mặc định false. */
  canTransferOwnership?: boolean;
  loading?: boolean;
  companies?: { id: string; name: string; isApproved?: boolean }[];
  landlords?: { id: string; name: string; email?: string }[];
  /** Cho phép tạo công ty mới ngay trong form (chủ nhà tự đăng tin). Mặc định true. */
  allowCreateCompany?: boolean;
  /** Công ty mặc định điền sẵn khi TẠO MỚI (chủ nhà chỉ có 1 công ty → khỏi phải chọn). Vẫn đổi được. */
  defaultCompanyId?: string;
}

const AMENITY_OPTIONS = [
  'Thang máy', 'Bảo vệ 24/7', 'Camera an ninh', 'Wifi miễn phí',
  'Gửi xe miễn phí', 'Máy giặt chung', 'Sân phơi', 'Khoá vân tay',
  'Điện năng lượng mặt trời', 'Nhà để xe',
];

// Dịch vụ mặc định của tòa nhà — điền SẴN mức phí thường gặp để người dùng chỉ cần sửa lại.
// Đơn vị (số/người/phòng) tự suy khi hiển thị công khai (formatServiceValue).
const DEFAULT_SERVICES: { label: string; value: string }[] = [
  { label: 'Điện', value: '4000' },        // 4.000đ/số
  { label: 'Nước', value: '120000' },      // 120.000đ/người
  { label: 'Dịch vụ chung', value: '150000' }, // 150.000đ/người
  { label: 'Internet', value: '100000' },  // 100.000đ/phòng
];

const FEATURE_TOGGLES = [
  { key: 'parkingCar', label: 'Ô tô đỗ cửa', icon: '🚗' },
  { key: 'parkingBike', label: 'Để xe máy', icon: '🏍️' },
  { key: 'evCharging', label: 'Sạc xe điện', icon: '⚡' },
  { key: 'petAllowed', label: 'Thú cưng OK', icon: '🐾' },
  { key: 'foreignerOk', label: 'Người nước ngoài', icon: '🌍' },
];

const defaultData: PropertyData = {
  name: '',
  description: '',
  houseNumber: '',
  fullAddress: '',
  district: '',
  streetName: '',
  city: 'Hà Nội',
  latitude: null,
  longitude: null,
  totalFloors: '',
  zaloPhone: '',
  landlordNotes: '',
  amenities: [],
  images: [],
  parkingCar: false,
  parkingBike: true,
  evCharging: false,
  petAllowed: false,
  foreignerOk: false,
  services: DEFAULT_SERVICES.map(s => ({ ...s })),
  status: 'PENDING',
};

export default function PropertyForm({ initialData, onSubmit, isAdmin = false, canTransferOwnership = false, loading = false, companies = [], landlords = [], allowCreateCompany = true, defaultCompanyId = '' }: PropertyFormProps) {
  const [form, setForm] = useState<PropertyData>(defaultData);
  // Tạo mới + chủ nhà có đúng 1 công ty → điền sẵn công ty đó (vẫn đổi được); sửa thì theo dữ liệu cũ.
  const [companyId, setCompanyId] = useState<string>(initialData?.companyId || (initialData?.id ? '' : defaultCompanyId) || '');
  const isEdit = !!initialData?.id;

  // Tạo công ty mới ngay trong form (chờ admin duyệt). extraCompanies giữ công ty vừa tạo/đang gán.
  const [extraCompanies, setExtraCompanies] = useState<{ id: string; name: string; isApproved?: boolean }[]>(
    initialData?.company ? [{ id: initialData.company.id, name: initialData.company.name, isApproved: initialData.company.isApproved }] : []
  );
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyPhone, setNewCompanyPhone] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);
  // Ô nhập toạ độ: giữ NGUYÊN VĂN thứ admin dán vào, tách khỏi lat/lng đã bóc được —
  // dán sai thì còn thấy mình vừa dán gì mà sửa, không bị ô tự xoá trắng.
  const [coordInput, setCoordInput] = useState('');
  const [coordMsg, setCoordMsg] = useState('');
  const [coordOk, setCoordOk] = useState(false);
  const [locating, setLocating] = useState(false);

  // Chỉ hiện công ty ĐÃ DUYỆT (isApproved !== false) + công ty vừa tạo (để chọn ngay). Bỏ trùng theo id.
  const companyOptions = (() => {
    const map = new Map<string, { id: string; name: string; isApproved?: boolean }>();
    // Hiện công ty đã duyệt + công ty đang được chọn (kể cả chờ duyệt) để select không bị trống khi sửa.
    for (const c of companies) if ((c as any).isApproved !== false || c.id === companyId) map.set(c.id, c);
    for (const c of extraCompanies) map.set(c.id, c);
    return Array.from(map.values());
  })();

  // Cảnh báo trùng tên: gõ tên công ty mới mà đã có công ty cùng tên (bỏ dấu) → gợi ý dùng lại.
  const normName = (s: string) => (s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ');
  const dupCompany = newCompanyName.trim().length >= 2
    ? [...companies, ...extraCompanies].find(c => normName(c.name) === normName(newCompanyName))
    : undefined;

  const handleCreateCompany = async () => {
    const name = newCompanyName.trim();
    if (!name) return toast.error('Nhập tên công ty');
    setCreatingCompany(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: newCompanyPhone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không tạo được công ty');
      setExtraCompanies(prev => [...prev, { id: data.id, name: data.name, isApproved: data.isApproved }]);
      setCompanyId(data.id);
      setShowNewCompany(false);
      setNewCompanyName(''); setNewCompanyPhone('');
      toast.success(data.isApproved ? 'Đã tạo công ty' : 'Đã tạo công ty — chờ admin duyệt');
    } catch (e: any) {
      toast.error(e.message || 'Lỗi tạo công ty');
    } finally {
      setCreatingCompany(false);
    }
  };
  // Đã bỏ ô chọn chủ nhà: tòa nhà thuộc CÔNG TY (chọn ở trên); admin tạo → server gắn admin.

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        description: initialData.description || '',
        // Tách dữ liệu cũ: số nhà vào ô riêng (ẩn), phần ngõ/ngách+đường vào ô hiển thị.
        houseNumber: initialData.houseNumber || extractHouseNumber(initialData.fullAddress) || '',
        fullAddress: redactHouseNumber(initialData.fullAddress) || initialData.fullAddress || '',
        district: initialData.district || '',
        streetName: initialData.streetName || '',
        city: initialData.city || 'Hà Nội',
        latitude: initialData.latitude ?? null,
        longitude: initialData.longitude ?? null,
        totalFloors: initialData.totalFloors || '',
        zaloPhone: initialData.zaloPhone || '',
        landlordNotes: initialData.landlordNotes || '',
        amenities: initialData.amenities || [],
        images: initialData.images || [],
        parkingCar: initialData.parkingCar ?? false,
        parkingBike: initialData.parkingBike ?? true,
        evCharging: initialData.evCharging ?? false,
        petAllowed: initialData.petAllowed ?? false,
        foreignerOk: initialData.foreignerOk ?? false,
        services: (Array.isArray(initialData.services) && initialData.services.length)
          ? initialData.services
          : DEFAULT_SERVICES.map(s => ({ ...s })),
        status: initialData.status || 'PENDING',
      });
    }
  }, [initialData]);

  const updateField = (field: keyof PropertyData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ── Ghim vị trí ────────────────────────────────────────────────────────────────
  const hasPin = form.latitude != null && form.longitude != null;

  const setPin = (lat: number | null, lng: number | null) =>
    setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));

  const clearPin = () => {
    setPin(null, null);
    setCoordInput('');
    setCoordOk(false);
    setCoordMsg('Đã bỏ ghim. Lưu lại thì tòa này sẽ biến mất khỏi bản đồ.');
  };

  /** Nhận link Google Maps / cặp số. Sai thì nói RÕ sai ở đâu, không im lặng nuốt. */
  const applyCoordInput = () => {
    const raw = coordInput.trim();
    if (!raw) return;
    const c = parseCoords(raw);
    if (!c) { setCoordOk(false); setCoordMsg(coordsError(raw) || 'Không đọc được toạ độ'); return; }
    setPin(c.lat, c.lng);
    setCoordOk(true);
    setCoordMsg(`Đã ghim ${formatCoords(c.lat, c.lng)} — bấm "Xem thử" để kiểm tra rồi mới Lưu.`);
  };

  /** Thử geocode từ địa chỉ đang nhập. Không thấy thì nói thẳng là phải ghim tay,
   *  đừng để admin bấm đi bấm lại chờ phép màu. */
  const autoLocate = async () => {
    const q = [form.houseNumber, form.fullAddress, form.district, form.city].map(v => (v || '').trim()).filter(Boolean).join(', ');
    if (!q) { setCoordOk(false); setCoordMsg('Nhập địa chỉ và quận/huyện trước đã.'); return; }
    setLocating(true);
    setCoordMsg('');
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      const hit = (json?.data || [])[0];
      const c = hit ? parseCoords(`${hit.lat}, ${hit.lon}`) : null;
      if (!c) {
        setCoordOk(false);
        setCoordMsg(`Bản đồ không tìm ra "${q}". Khu đô thị mới thường chưa có trên bản đồ — mở Google Maps, bấm giữ vào vị trí tòa nhà rồi copy toạ độ dán vào ô bên trên.`);
        return;
      }
      setPin(c.lat, c.lng);
      setCoordInput(formatCoords(c.lat, c.lng));
      setCoordOk(true);
      setCoordMsg(`Tìm thấy: ${hit.display_name?.slice(0, 90) || formatCoords(c.lat, c.lng)} — BẤM "Xem thử" kiểm tra đúng chỗ chưa rồi mới Lưu.`);
    } catch {
      setCoordOk(false);
      setCoordMsg('Không gọi được dịch vụ bản đồ. Ghim tay bằng toạ độ Google Maps nhé.');
    } finally {
      setLocating(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const toggleFeature = (key: string) => {
    setForm(prev => ({ ...prev, [key]: !prev[key as keyof PropertyData] }));
  };

  const updateService = (i: number, field: 'label' | 'value', v: string) => {
    setForm(prev => ({ ...prev, services: prev.services.map((s, idx) => idx === i ? { ...s, [field]: v } : s) }));
  };
  const addService = () => setForm(prev => ({ ...prev, services: [...prev.services, { label: '', value: '' }] }));
  const removeService = (i: number) => setForm(prev => ({ ...prev, services: prev.services.filter((_, idx) => idx !== i) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) return toast.error('Vui lòng nhập tên tòa nhà');
    if (!form.fullAddress.trim()) return toast.error('Vui lòng nhập đường/ngõ/ngách');
    if (!form.district.trim()) return toast.error('Vui lòng nhập quận/huyện');

    // fullAddress lưu trữ (nội bộ/staff) = số nhà + đường/ngõ/ngách. Khách chỉ thấy phần đường/ngõ/ngách.
    const combinedFullAddress = [form.houseNumber.trim(), form.fullAddress.trim()].filter(Boolean).join(' ');
    // Bỏ ô "Tên đường" → streetName lấy từ phần Đường/Ngõ/Ngách để vẫn phục vụ tìm kiếm/hiển thị.
    const streetName = form.streetName.trim() || form.fullAddress.trim();
    // Chỉ giữ dịch vụ có nhập cả tên + mức phí.
    const services = form.services.filter(s => s.label.trim() && s.value.trim()).map(s => ({ label: s.label.trim(), value: s.value.trim() }));

    onSubmit({
      ...form,
      streetName,
      services,
      fullAddress: combinedFullAddress,
      houseNumber: form.houseNumber.trim() || null,
      companyId: companyId || null,
      // Không gửi landlordId nữa: admin tạo → server gắn admin; chủ nhà tự tạo → server gắn chính họ.
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Thông tin cơ bản */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Thông tin cơ bản</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Thuộc công ty — chọn công ty ĐANG HOẠT ĐỘNG hoặc TẠO công ty mới (chờ admin duyệt) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Thuộc công ty</label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <SearchableSelect
                  value={companyId}
                  onChange={setCompanyId}
                  disabled={creatingCompany}
                  placeholder="— Không thuộc công ty nào —"
                  options={[
                    { value: '', label: '— Không thuộc công ty nào —' },
                    ...companyOptions.map(c => ({
                      value: c.id,
                      label: `${c.name}${(c as any).isApproved === false ? ' (chờ duyệt)' : ''}`,
                    })),
                  ]}
                />
              </div>
              {allowCreateCompany && (
                <button type="button" onClick={() => setShowNewCompany(v => !v)}
                  className="shrink-0 px-3 py-2 rounded-xl text-sm font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors whitespace-nowrap">
                  + Công ty mới
                </button>
              )}
            </div>
            {allowCreateCompany && showNewCompany && (
              <div className="mt-2 p-3 rounded-xl border border-brand-100 bg-brand-50/40 space-y-2">
                <p className="text-xs text-stone-500">Tạo công ty mới — cần <b>admin duyệt</b> trước khi vào danh sách công ty đang hoạt động.</p>
                <input className="input-field" placeholder="Tên công ty *" value={newCompanyName}
                  onChange={e => setNewCompanyName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCompany(); } }} />
                {dupCompany && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    ⚠️ Đã có công ty tên <b>&quot;{dupCompany.name}&quot;</b>.{' '}
                    <button type="button"
                      onClick={() => { setCompanyId(dupCompany.id); setShowNewCompany(false); setNewCompanyName(''); setNewCompanyPhone(''); toast.success(`Đã chọn công ty "${dupCompany.name}"`); }}
                      className="font-semibold underline hover:text-amber-900">Dùng công ty này</button>{' '}thay vì tạo trùng.
                  </div>
                )}
                <input className="input-field" placeholder="SĐT/Zalo liên hệ (tuỳ chọn)" value={newCompanyPhone}
                  onChange={e => setNewCompanyPhone(e.target.value)} />
                <div className="flex gap-2">
                  <button type="button" onClick={handleCreateCompany} disabled={creatingCompany}
                    className="btn-primary text-sm !py-2">{creatingCompany ? 'Đang tạo...' : 'Tạo công ty'}</button>
                  <button type="button" onClick={() => { setShowNewCompany(false); setNewCompanyName(''); setNewCompanyPhone(''); }}
                    className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700">Huỷ</button>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Tên tòa nhà <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="VD: Chung cư mini Hoàng Mai"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Địa chỉ */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Địa chỉ</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Số nhà <span className="text-[11px] font-normal text-amber-600">🔒 ẩn với khách</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="VD: Số 25, 12B, 30/4..."
              value={form.houseNumber}
              onChange={e => updateField('houseNumber', e.target.value)}
            />
            <p className="text-[11px] text-stone-400 mt-1">Khách KHÔNG nhìn thấy số nhà — chỉ dùng nội bộ.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Đường / Ngõ / Ngách <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="VD: Ngõ 59 Hoàng Hoa Thám"
              value={form.fullAddress}
              onChange={e => updateField('fullAddress', e.target.value)}
            />
            <p className="text-[11px] text-stone-400 mt-1">Phần này HIỆN cho khách (tối đa tới ngõ/ngách).</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Quận/Huyện <span className="text-red-500">*</span>
            </label>
            <Combobox
              options={HANOI_DISTRICTS}
              value={form.district}
              onChange={v => updateField('district', v)}
              placeholder="Chọn hoặc gõ quận/huyện…"
              allowFreeText={false}
            />
            <p className="text-[11px] text-stone-400 mt-1">Tự điền theo tên đường — sửa lại nếu chưa đúng.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Thành phố</label>
            <input
              type="text"
              className="input-field"
              value={form.city}
              onChange={e => updateField('city', e.target.value)}
            />
          </div>
        </div>

        {/* ── GHIM VỊ TRÍ TRÊN BẢN ĐỒ ─────────────────────────────────────────────
            Vì sao có ô này: geocode tự động (Nominatim/OSM) KHÔNG biết phần lớn khu đô thị
            mới ở Việt Nam. Đo 18/08/2026: "Khu đô thị mới HUD Vân Canh" (17 tin) và
            "66 Nam 32" (1 tin) trượt mọi cách hỏi ở cả Nominatim lẫn Overpass — chạy lại
            scripts/geocode-properties.js bao nhiêu lần cũng vẫn trượt. Trước đây form KHÔNG
            có ô toạ độ nào, nên thẻ "Tòa nhà thiếu toạ độ" ở Tổng quan bấm vào là tới danh
            sách rồi bó tay — trái đúng quy tắc "việc hiện ra phải tới được chỗ xử lý". */}
        <div className="mt-5 pt-5 border-t border-stone-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label className="block text-sm font-medium text-stone-700">📍 Vị trí trên bản đồ</label>
            {hasPin ? (
              <span className="inline-flex items-center gap-2 text-xs">
                <span className="text-emerald-700 font-medium">✅ Đã ghim {formatCoords(form.latitude!, form.longitude!)}</span>
                <a href={mapPreviewUrl(form.latitude!, form.longitude!)} target="_blank" rel="noopener noreferrer"
                  className="text-brand-600 font-medium hover:underline">Xem thử ↗</a>
                <button type="button" onClick={clearPin} className="text-stone-400 hover:text-red-600">Bỏ ghim</button>
              </span>
            ) : (
              <span className="text-xs font-medium text-amber-700">⚠️ Chưa ghim — tòa này KHÔNG hiện trên bản đồ tìm phòng</span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              className="input-field flex-1"
              value={coordInput}
              onChange={e => { setCoordInput(e.target.value); setCoordMsg(''); }}
              onBlur={() => applyCoordInput()}
              placeholder="Dán link Google Maps, hoặc gõ 21.039103, 105.730912"
              aria-label="Toạ độ hoặc link Google Maps"
            />
            <button type="button" onClick={applyCoordInput} disabled={!coordInput.trim()}
              className="btn-secondary whitespace-nowrap disabled:opacity-40">Ghim</button>
            <button type="button" onClick={autoLocate} disabled={locating}
              className="btn-ghost whitespace-nowrap border border-stone-200"
              title="Thử tìm toạ độ từ địa chỉ đã nhập">
              {locating ? 'Đang tìm…' : '🎯 Tìm theo địa chỉ'}
            </button>
          </div>

          {coordMsg && (
            <p className={`text-xs mt-1.5 ${coordOk ? 'text-emerald-700' : 'text-red-600'}`}>{coordMsg}</p>
          )}
          <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">
            Lấy toạ độ: mở <strong>Google Maps</strong> → bấm giữ vào đúng vị trí tòa nhà → dãy số hiện ra ở ô tìm kiếm, bấm để copy rồi dán vào đây.
            Dán cả link cũng được. Nút <strong>🎯 Tìm theo địa chỉ</strong> chỉ chạy được với đường/phố có trên bản đồ —
            khu đô thị mới thường không có, phải ghim tay.
          </p>
        </div>
      </div>

      {/* Section 3: Liên hệ & Ghi chú */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Liên hệ & Ghi chú cho cộng tác viên</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">SĐT/Zalo người quản lý tòa nhà</label>
            <input
              type="text"
              className="input-field"
              placeholder="VD: 0912345678"
              value={form.zaloPhone}
              onChange={e => updateField('zaloPhone', e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Lưu ý cho cộng tác viên</label>
            <textarea
              className="input-field min-h-[80px] resize-y"
              placeholder="Thông tin riêng dành cho CTV: giờ xem phòng, cách liên hệ..."
              value={form.landlordNotes}
              onChange={e => updateField('landlordNotes', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Section 4: Tiện ích chung */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Tiện ích chung</h3>
        <div className="flex flex-wrap gap-2">
          {AMENITY_OPTIONS.map(amenity => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${
                form.amenities.includes(amenity)
                  ? 'bg-brand-50 border-brand-300 text-brand-700'
                  : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              {form.amenities.includes(amenity) && (
                <span className="mr-1.5">✓</span>
              )}
              {amenity}
            </button>
          ))}
        </div>
      </div>

      {/* Section: Dịch vụ tòa nhà */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Dịch vụ tòa nhà</h3>
        <p className="text-xs text-stone-500 mb-3">Đã điền sẵn mức phí phổ biến — chỉ cần sửa lại cho đúng tòa nhà của bạn. Bấm &quot;+ Thêm dịch vụ&quot; nếu thu thêm dịch vụ khác.</p>
        <div className="space-y-2">
          {form.services.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input type="text" className="input-field flex-1" placeholder="Tên dịch vụ (VD: Điện)"
                value={s.label} onChange={e => updateService(i, 'label', e.target.value)} />
              <input type="text" inputMode="numeric" className="input-field flex-1" placeholder="Mức phí (VD: 4000)"
                value={s.value} onChange={e => updateService(i, 'value', e.target.value)} />
              <button type="button" onClick={() => removeService(i)}
                className="shrink-0 w-9 h-9 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors">✕</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addService}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors">
          + Thêm dịch vụ
        </button>
      </div>

      {/* Section 5: Đặc điểm */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Đặc điểm nổi bật</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {FEATURE_TOGGLES.map(feat => (
            <button
              key={feat.key}
              type="button"
              onClick={() => toggleFeature(feat.key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                form[feat.key as keyof PropertyData]
                  ? 'border-brand-400 bg-brand-50 text-brand-700'
                  : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'
              }`}
            >
              <span className="text-2xl">{feat.icon}</span>
              <span className="text-xs font-medium text-center leading-tight">{feat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 7: Admin - Trạng thái */}
      {isAdmin && (
        <div className="card">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Quản trị</h3>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Trạng thái duyệt</label>
            <select
              className="input-field"
              value={form.status}
              onChange={e => updateField('status', e.target.value)}
            >
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
            </select>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary px-8">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Đang lưu...
            </span>
          ) : (
            isEdit ? 'Cập nhật tòa nhà' : 'Tạo tòa nhà'
          )}
        </button>
      </div>
    </form>
  );
}
