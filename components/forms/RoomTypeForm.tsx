'use client';

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import ImageUpload from '@/components/ui/ImageUpload';
import { formatCurrency } from '@/lib/utils';

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
  isAvailable: boolean;
  amenities: string[];
  images: string[];
  commissionRows: { months: string; percent: number }[];
  landlordNotes: string;
  isApproved: boolean;
}

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
  isAvailable: true,
  amenities: [],
  images: [],
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
        isAvailable: initialData.isAvailable ?? true,
        amenities: initialData.amenities || [],
        images: initialData.images || [],
        commissionRows: parseCommission(initialData.commissionJson),
        landlordNotes: initialData.landlordNotes || '',
        isApproved: initialData.isApproved ?? false,
      };
      setForm(data);
      setPriceDisplay(data.priceMonthly ? formatVndInput(data.priceMonthly) : '');
      setDepositDisplay(data.deposit ? formatVndInput(data.deposit) : '');
      setShortTermPriceDisplay(data.shortTermPrice ? formatVndInput(data.shortTermPrice) : '');
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
  };

  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseVndInput(e.target.value);
    setDepositDisplay(num ? formatVndInput(num) : '');
    updateField('deposit', num);
  };

  const handleShortTermPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseVndInput(e.target.value);
    setShortTermPriceDisplay(num ? formatVndInput(num) : '');
    updateField('shortTermPrice', num);
  };

  // Auto-set deposit = priceMonthly when price changes and deposit is 0
  useEffect(() => {
    if (form.priceMonthly > 0 && form.deposit === 0 && !isEdit) {
      updateField('deposit', form.priceMonthly);
      setDepositDisplay(formatVndInput(form.priceMonthly));
    }
  }, [form.priceMonthly]);

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
    if (!form.name.trim()) return toast.error('Vui lòng nhập tên loại phòng');
    if (!form.typeName) return toast.error('Vui lòng chọn kiểu phòng');
    if (!form.areaSqm || form.areaSqm <= 0) return toast.error('Vui lòng nhập diện tích');
    if (!form.priceMonthly || form.priceMonthly <= 0) return toast.error('Vui lòng nhập giá thuê');
    if (form.availableUnits > form.totalUnits) return toast.error('Số phòng trống không được lớn hơn tổng số phòng');

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
      isAvailable: form.isAvailable,
      amenities: form.amenities,
      images: form.images,
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
              Tên loại phòng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder='VD: "Loại 1 - Phòng đơn 25m²"'
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
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Mô tả</label>
            <textarea
              className="input-field min-h-[80px] resize-y"
              placeholder="Mô tả chi tiết loại phòng: hướng cửa, view, nội thất..."
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              rows={3}
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
              placeholder="Mặc định = 1 tháng tiền thuê"
              value={depositDisplay}
              onChange={handleDepositChange}
            />
            {form.deposit > 0 && (
              <p className="text-xs text-stone-400 mt-1">{formatCurrency(form.deposit)}</p>
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
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.isAvailable}
                  onChange={e => updateField('isAvailable', e.target.checked)}
                />
                <div className="w-10 h-6 bg-stone-200 rounded-full peer-checked:bg-emerald-600 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
              </div>
              <span className="text-sm font-medium text-stone-700">Bật/tắt nhanh toàn bộ loại phòng này</span>
            </label>
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
          <div className="flex flex-wrap gap-6">
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
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.isAvailable}
                  onChange={e => updateField('isAvailable', e.target.checked)}
                />
                <div className="w-10 h-6 bg-stone-200 rounded-full peer-checked:bg-emerald-600 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
              </div>
              <span className="text-sm font-medium text-stone-700">Còn phòng trống (isAvailable)</span>
            </label>
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
            isEdit ? 'Cập nhật loại phòng' : 'Tạo loại phòng'
          )}
        </button>
      </div>
    </form>
  );
}
