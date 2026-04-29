'use client';

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import ImageUpload from '@/components/ui/ImageUpload';
import VideoUpload from '@/components/ui/VideoUpload';
import VideoLinkInput from '@/components/ui/VideoLinkInput';
import { formatCurrency } from '@/lib/utils';

type RoomStatusValue = 'AVAILABLE' | 'UNAVAILABLE' | 'UPCOMING';

interface RoomTypeData {
  propertyId: string;
  name: string;
  typeName: string;
  areaSqm: number;
  priceMonthly: number;
  deposit: number;
  description: string;
  shortTermAllowed: boolean;
  shortTermMonths: string;
  shortTermPrice: number;
  totalUnits: number;
  availableUnits: number;
  availableRoomNames: string;
  status: RoomStatusValue;
  expectedAvailableDate: string; // ISO date string yyyy-MM-dd or ''
  amenities: string[];
  images: string[];
  videos: string[];
  videoLinks: string[];
  commissionRows: { months: string; percent: number }[];
  landlordNotes: string;
  isApproved: boolean;
}

const STATUS_OPTIONS: { value: RoomStatusValue; label: string; cls: string }[] = [
  { value: 'AVAILABLE',   label: '🟢 Còn phòng',   cls: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  { value: 'UPCOMING',    label: '🟡 Sắp trống',   cls: 'bg-amber-50 border-amber-300 text-amber-700' },
  { value: 'UNAVAILABLE', label: '🔴 Hết phòng',   cls: 'bg-red-50 border-red-300 text-red-700' },
];

interface Property {
  id: string;
  name: string;
  district?: string;
}

interface RoomTypeFormProps {
  initialData?: any;
  properties: Property[];
  onSubmit: (data: any) => void;
  isAdmin?: boolean;
  loading?: boolean;
}

const ROOM_TYPES = [
  { value: 'don', label: 'Phòng đơn' },
  { value: 'gac_xep', label: 'Gác xép' },
  { value: '1k1n', label: '1 khách 1 ngủ' },
  { value: '2k1n', label: '2 khách 1 ngủ' },
  { value: 'studio', label: 'Studio' },
  { value: 'duplex', label: 'Duplex' },
];

const AMENITY_OPTIONS = [
  'Điều hoà', 'Nóng lạnh', 'WC riêng', 'Bếp riêng', 'Ban công',
  'Giường', 'Tủ quần áo', 'Máy giặt riêng', 'Tủ lạnh', 'Bàn làm việc',
  'Kệ bếp', 'Bình nóng lạnh', 'Rèm cửa', 'Quạt trần', 'Smart TV',
];

const defaultData: RoomTypeData = {
  propertyId: '',
  name: '',
  typeName: 'don',
  areaSqm: 0,
  priceMonthly: 0,
  deposit: 0,
  description: '',
  shortTermAllowed: false,
  shortTermMonths: '',
  shortTermPrice: 0,
  totalUnits: 1,
  availableUnits: 1,
  availableRoomNames: '',
  status: 'AVAILABLE',
  expectedAvailableDate: '',
  amenities: [],
  images: [],
  videos: [],
  videoLinks: [],
  commissionRows: [
    { months: '6', percent: 40 },
    { months: '12', percent: 50 },
  ],
  landlordNotes: '',
  isApproved: false,
};

// Parse commissionJson string/object → rows array
function parseCommission(val: any): { months: string; percent: number }[] {
  try {
    const obj = typeof val === 'string' ? JSON.parse(val) : val;
    if (!obj || typeof obj !== 'object') return defaultData.commissionRows;
    return Object.entries(obj).map(([months, percent]) => ({
      months,
      percent: Number(percent),
    }));
  } catch {
    return defaultData.commissionRows;
  }
}

// Format VND input: 3500000 → "3.500.000"
function formatVndInput(val: number | string): string {
  const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : val;
  if (!num || isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
}

function parseVndInput(str: string): number {
  return parseInt(str.replace(/\D/g, ''), 10) || 0;
}

export default function RoomTypeForm({ initialData, properties, onSubmit, isAdmin = false, loading = false }: RoomTypeFormProps) {
  const [form, setForm] = useState<RoomTypeData>(defaultData);
  const [priceDisplay, setPriceDisplay] = useState('');
  const [depositDisplay, setDepositDisplay] = useState('');
  const [shortTermPriceDisplay, setShortTermPriceDisplay] = useState('');
  // Track whether user manually edited deposit. true → don't auto-sync with priceMonthly.
  const [depositTouched, setDepositTouched] = useState(false);
  const isEdit = !!initialData?.id;

  useEffect(() => {
    if (initialData) {
      const data: RoomTypeData = {
        propertyId: initialData.propertyId || '',
        name: initialData.name || '',
        typeName: initialData.typeName || 'don',
        areaSqm: initialData.areaSqm || 0,
        priceMonthly: initialData.priceMonthly || 0,
        deposit: initialData.deposit || 0,
        description: initialData.description || '',
        shortTermAllowed: initialData.shortTermAllowed ?? false,
        shortTermMonths: initialData.shortTermMonths || '',
        shortTermPrice: initialData.shortTermPrice || 0,
        totalUnits: initialData.totalUnits || 1,
        availableUnits: initialData.availableUnits ?? 1,
        availableRoomNames: initialData.availableRoomNames || '',
        status: (initialData.status as RoomStatusValue) || (initialData.isAvailable === false ? 'UNAVAILABLE' : 'AVAILABLE'),
        expectedAvailableDate: initialData.expectedAvailableDate
          ? new Date(initialData.expectedAvailableDate).toISOString().slice(0, 10)
          : '',
        amenities: initialData.amenities || [],
        images: initialData.images || [],
        videos: initialData.videos || [],
        videoLinks: initialData.videoLinks || [],
        commissionRows: parseCommission(initialData.commissionJson),
        landlordNotes: initialData.landlordNotes || '',
        isApproved: initialData.isApproved ?? false,
      };
      setForm(data);
      setPriceDisplay(data.priceMonthly ? formatVndInput(data.priceMonthly) : '');
      setDepositDisplay(data.deposit ? formatVndInput(data.deposit) : '');
      setShortTermPriceDisplay(data.shortTermPrice ? formatVndInput(data.shortTermPrice) : '');
      // When editing existing record, treat deposit as user-set unless it equals price (then assume default).
      // Bỏ check > 0 để tôn trọng cả "deposit = 0" (không yêu cầu cọc) khi khác price.
      setDepositTouched(data.deposit !== data.priceMonthly);
    }
  }, [initialData]);

  const updateField = (field: keyof RoomTypeData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  // VND input handlers
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseVndInput(e.target.value);
    setPriceDisplay(num ? formatVndInput(num) : '');
    updateField('priceMonthly', num);
    // Auto-sync deposit if user hasn't manually edited it
    if (!depositTouched) {
      updateField('deposit', num);
      setDepositDisplay(num ? formatVndInput(num) : '');
    }
  };

  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseVndInput(raw);
    setDepositDisplay(num ? formatVndInput(num) : '');
    updateField('deposit', num);
    // CHỈ reset dirty flag khi user xoá hẳn input (truly empty).
    // Nếu user gõ "0" → respect intent "không cọc", giữ touched = true.
    if (raw.trim() === '') {
      setDepositTouched(false);
      if (form.priceMonthly > 0) {
        updateField('deposit', form.priceMonthly);
        setDepositDisplay(formatVndInput(form.priceMonthly));
      }
    } else {
      setDepositTouched(true);
    }
  };

  const handleShortTermPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseVndInput(e.target.value);
    setShortTermPriceDisplay(num ? formatVndInput(num) : '');
    updateField('shortTermPrice', num);
  };

  // Commission rows management
  const addCommissionRow = () => {
    setForm(prev => ({
      ...prev,
      commissionRows: [...prev.commissionRows, { months: '', percent: 0 }],
    }));
  };

  const removeCommissionRow = (index: number) => {
    setForm(prev => ({
      ...prev,
      commissionRows: prev.commissionRows.filter((_, i) => i !== index),
    }));
  };

  const updateCommissionRow = (index: number, field: 'months' | 'percent', value: string | number) => {
    setForm(prev => ({
      ...prev,
      commissionRows: prev.commissionRows.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      ),
    }));
  };

  // Real-time commission calculation
  const commissionCalcs = useMemo(() => {
    if (!form.priceMonthly) return [];
    return form.commissionRows.map(row => ({
      months: row.months,
      percent: row.percent,
      amount: formatCurrency((row.percent / 100) * form.priceMonthly),
    }));
  }, [form.priceMonthly, form.commissionRows]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.propertyId) return toast.error('Vui lòng chọn tòa nhà');
    if (!form.name.trim()) return toast.error('Vui lòng nhập tiêu đề bài đăng');
    if (!form.typeName) return toast.error('Vui lòng chọn kiểu phòng');
    if (!form.areaSqm || form.areaSqm <= 0) return toast.error('Vui lòng nhập diện tích');
    if (!form.priceMonthly || form.priceMonthly <= 0) return toast.error('Vui lòng nhập giá thuê');
    if (form.availableUnits > form.totalUnits) return toast.error('Số phòng trống không được lớn hơn tổng số phòng');
    if (form.status === 'UPCOMING' && !form.expectedAvailableDate) {
      return toast.error('Vui lòng chọn ngày phòng sẽ trống');
    }
    if (form.status === 'UPCOMING' && form.expectedAvailableDate) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(form.expectedAvailableDate) < today) {
        return toast.error('Ngày sắp trống không được ở quá khứ');
      }
    }

    // Build commissionJson from rows
    const commissionObj: Record<string, number> = {};
    form.commissionRows.forEach(row => {
      if (row.months && row.percent > 0) {
        commissionObj[row.months] = row.percent;
      }
    });

    const submitData = {
      propertyId: form.propertyId,
      name: form.name,
      typeName: form.typeName,
      areaSqm: form.areaSqm,
      priceMonthly: form.priceMonthly,
      deposit: form.deposit,
      description: form.description,
      shortTermAllowed: form.shortTermAllowed,
      shortTermMonths: form.shortTermAllowed ? form.shortTermMonths : null,
      shortTermPrice: form.shortTermAllowed ? form.shortTermPrice : null,
      totalUnits: form.totalUnits,
      availableUnits: form.availableUnits,
      availableRoomNames: form.availableRoomNames || null,
      status: form.status,
      expectedAvailableDate: form.status === 'UPCOMING' && form.expectedAvailableDate
        ? new Date(form.expectedAvailableDate).toISOString()
        : null,
      amenities: form.amenities,
      images: form.images,
      videos: form.videos,
      videoLinks: form.videoLinks,
      commissionJson: JSON.stringify(commissionObj),
      landlordNotes: form.landlordNotes,
      isApproved: form.isApproved,
    };

    onSubmit(submitData);
  };

  // Approved properties only
  const approvedProperties = properties;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Thông tin cơ bản */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Thông tin cơ bản</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Tòa nhà <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={form.propertyId}
              onChange={e => updateField('propertyId', e.target.value)}
            >
              <option value="">-- Chọn tòa nhà --</option>
              {approvedProperties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.district ? ` — ${p.district}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Tiêu đề bài đăng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder='VD: "Phòng đơn 25m² Cầu Giấy — full nội thất, ban công"'
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Kiểu phòng <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={form.typeName}
              onChange={e => updateField('typeName', e.target.value)}
            >
              {ROOM_TYPES.map(rt => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Diện tích m² <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className="input-field"
              min={1}
              step={0.5}
              placeholder="VD: 25"
              value={form.areaSqm || ''}
              onChange={e => updateField('areaSqm', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Mô tả và giá dịch vụ</label>
            <textarea
              className="input-field min-h-[80px] resize-y"
              placeholder="Mô tả chi tiết: hướng cửa, view, nội thất... Kèm giá điện, nước, mạng, vệ sinh, gửi xe..."
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Giá & Đặt cọc */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Giá thuê & Đặt cọc</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Giá thuê/tháng (VNĐ) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="VD: 3.500.000"
              value={priceDisplay}
              onChange={handlePriceChange}
            />
            {form.priceMonthly > 0 && (
              <p className="text-xs text-stone-400 mt-1">{formatCurrency(form.priceMonthly)}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Đặt cọc (VNĐ)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Mặc định = giá thuê/tháng"
              value={depositDisplay}
              onChange={handleDepositChange}
            />
            <p className="text-xs text-stone-400 mt-1">
              {depositTouched
                ? '✏️ Bạn đã sửa thủ công. Xoá trống để tự đồng bộ lại theo giá thuê.'
                : 'Mặc định = giá thuê/tháng. Sửa nếu muốn đặt cọc khác.'}
            </p>
            {form.deposit > 0 && (
              <p className="text-xs text-stone-400 mt-0.5">{formatCurrency(form.deposit)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Cho thuê ngắn hạn */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Cho thuê ngắn hạn</h3>
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={form.shortTermAllowed}
              onChange={e => updateField('shortTermAllowed', e.target.checked)}
            />
            <div className="w-10 h-6 bg-stone-200 rounded-full peer-checked:bg-violet-600 transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
          </div>
          <span className="text-sm font-medium text-stone-700">Cho phép thuê ngắn hạn</span>
        </label>
        {form.shortTermAllowed && (
          <div className="grid md:grid-cols-2 gap-4 pl-1 border-l-2 border-violet-200 ml-1">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Số tháng cho phép
              </label>
              <input
                type="text"
                className="input-field"
                placeholder='VD: "1,2,3"'
                value={form.shortTermMonths}
                onChange={e => updateField('shortTermMonths', e.target.value)}
              />
              <p className="text-xs text-stone-400 mt-1">Nhập các mức tháng, cách nhau bằng dấu phẩy</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Giá thuê ngắn hạn/tháng (VNĐ)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Có thể cao hơn giá dài hạn"
                value={shortTermPriceDisplay}
                onChange={handleShortTermPriceChange}
              />
              {form.shortTermPrice > 0 && (
                <p className="text-xs text-stone-400 mt-1">{formatCurrency(form.shortTermPrice)}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Số lượng & Phòng trống */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Số lượng & Phòng trống</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Tổng số phòng loại này
            </label>
            <input
              type="number"
              className="input-field"
              min={1}
              value={form.totalUnits}
              onChange={e => {
                const val = parseInt(e.target.value) || 1;
                updateField('totalUnits', val);
                if (form.availableUnits > val) updateField('availableUnits', val);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Số phòng đang trống
            </label>
            <input
              type="number"
              className="input-field"
              min={0}
              max={form.totalUnits}
              value={form.availableUnits}
              onChange={e => {
                const val = parseInt(e.target.value) || 0;
                updateField('availableUnits', Math.min(val, form.totalUnits));
              }}
            />
            {form.availableUnits > form.totalUnits && (
              <p className="text-xs text-red-500 mt-1">Không được lớn hơn tổng số phòng</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Tên/số phòng đang trống
            </label>
            <textarea
              className="input-field min-h-[60px] resize-y"
              placeholder='VD: "101, 201, 301"'
              value={form.availableRoomNames}
              onChange={e => updateField('availableRoomNames', e.target.value)}
              rows={2}
            />
            <p className="text-xs text-stone-400 mt-1">
              🔒 Chỉ hiển thị nội bộ cho bạn, admin và môi giới. Khách xem tin đăng chỉ thấy số lượng phòng trống.
            </p>
          </div>

          {/* Trạng thái 3 mức */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-2">Trạng thái tin đăng</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('status', opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.status === opt.value
                      ? opt.cls
                      : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {form.status === 'UPCOMING' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Ngày phòng sẽ trống <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className="input-field max-w-xs"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.expectedAvailableDate}
                  onChange={e => updateField('expectedAvailableDate', e.target.value)}
                />
                <p className="text-xs text-stone-400 mt-1">
                  Khách sẽ thấy &ldquo;Sắp trống từ {form.expectedAvailableDate
                    ? new Date(form.expectedAvailableDate).toLocaleDateString('vi-VN')
                    : 'DD/MM/YYYY'}&rdquo; để chủ động liên hệ sớm.
                </p>
              </div>
            )}

            {form.status === 'AVAILABLE' && form.availableUnits === 0 && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Đang chọn &ldquo;Còn phòng&rdquo; nhưng số phòng trống = 0. Cập nhật lại?
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section 5: Tiện ích phòng */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Tiện ích phòng</h3>
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

      {/* Section 6: Ảnh tin đăng */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-2">Ảnh tin đăng</h3>
        <p className="text-xs text-stone-400 mb-4">3 ảnh đầu tiên sẽ hiển thị ngoài tin đăng cho khách xem. Tối đa 10 ảnh.</p>
        <ImageUpload
          images={form.images}
          onChange={urls => updateField('images', urls)}
          maxImages={10}
          folder="rooms"
        />
      </div>

      {/* Section 6b: Video tin đăng */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-1">Video tin đăng</h3>
        <p className="text-xs text-stone-400 mb-4">Có thể dùng cả 2 cách: upload video tự quay và/hoặc dán link từ YouTube, TikTok, Facebook.</p>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-stone-700 mb-1">📹 Upload video (tối đa 3)</p>
            <p className="text-xs text-stone-400 mb-2">Video ngắn 15-30 giây quay bằng điện thoại. Định dạng MP4/WebM/MOV, ≤ 50MB mỗi file.</p>
            <VideoUpload
              videos={form.videos}
              onChange={urls => updateField('videos', urls)}
              maxVideos={3}
              folder="videos"
            />
          </div>

          <div className="pt-4 border-t border-stone-100">
            <p className="text-sm font-medium text-stone-700 mb-1">🔗 Link video (tối đa 5)</p>
            <p className="text-xs text-stone-400 mb-2">Dán link video từ YouTube, TikTok hoặc Facebook.</p>
            <VideoLinkInput
              videoLinks={form.videoLinks}
              onChange={links => updateField('videoLinks', links)}
              maxLinks={5}
            />
          </div>
        </div>
      </div>

      {/* Section 7: Hoa hồng cho MG */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Hoa hồng cho Môi giới</h3>
        <div className="space-y-3">
          {form.commissionRows.map((row, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-stone-500 mb-1">Số tháng thuê</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="VD: 6"
                  value={row.months}
                  onChange={e => updateCommissionRow(index, 'months', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-stone-500 mb-1">Hoa hồng (%)</label>
                <input
                  type="number"
                  className="input-field"
                  min={0}
                  max={100}
                  value={row.percent}
                  onChange={e => updateCommissionRow(index, 'percent', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-stone-500 mb-1">Thành tiền</label>
                <div className="h-[42px] flex items-center text-sm text-emerald-600 font-medium">
                  {commissionCalcs[index] && row.months && row.percent > 0
                    ? `${row.percent}% × ${formatCurrency(form.priceMonthly)} = ${commissionCalcs[index].amount}`
                    : '—'
                  }
                </div>
              </div>
              {form.commissionRows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCommissionRow(index)}
                  className="mt-6 w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Xoá mức"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addCommissionRow}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm mức hoa hồng
          </button>
        </div>
      </div>

      {/* Section 8: Lưu ý cho MG */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Lưu ý cho Môi giới</h3>
        <textarea
          className="input-field min-h-[80px] resize-y"
          placeholder="VD: Khách phải đặt cọc 2 tháng, ưu tiên nữ, không nấu nướng..."
          value={form.landlordNotes}
          onChange={e => updateField('landlordNotes', e.target.value)}
          rows={3}
        />
      </div>

      {/* Section 9: Admin controls */}
      {isAdmin && (
        <div className="card">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Quản trị</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={form.isApproved}
                onChange={e => updateField('isApproved', e.target.checked)}
              />
              <div className="w-10 h-6 bg-stone-200 rounded-full peer-checked:bg-brand-600 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
            </div>
            <span className="text-sm font-medium text-stone-700">Đã duyệt (isApproved)</span>
          </label>
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
            isEdit ? 'Cập nhật tin đăng' : 'Tạo tin đăng'
          )}
        </button>
      </div>
    </form>
  );
}
