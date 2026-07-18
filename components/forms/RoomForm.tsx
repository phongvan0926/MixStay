'use client';

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import ImageUpload from '@/components/ui/ImageUpload';
import { formatCurrency } from '@/lib/utils';
// Danh mục tiện ích dùng chung (tránh 3 form lệch nhau)
import { AMENITY_OPTIONS } from '@/lib/listing-options';

interface RoomData {
  propertyId: string;
  roomNumber: string;
  floor: number;
  roomType: string;
  areaSqm: number;
  priceMonthly: number;
  deposit: number;
  description: string;
  amenities: string[];
  images: string[];
  landlordNotes: string;
  commission6: number;
  commission12: number;
  isAvailable: boolean;
  isApproved: boolean;
}

interface Property {
  id: string;
  name: string;
  district?: string;
}

interface RoomFormProps {
  initialData?: any;
  properties: Property[];
  onSubmit: (data: any) => void;
  isAdmin?: boolean;
  loading?: boolean;
}

const ROOM_TYPES = [
  { value: 'studio', label: 'Studio' },
  { value: 'gac_xep', label: 'Gác xép' },
  { value: 'don', label: 'Phòng đơn' },
  { value: '1k1n', label: '1 ngủ 1 khách' },
  { value: '2k1n', label: '2 ngủ 1 khách' },
  { value: 'duplex', label: 'Duplex' },
];


const defaultData: RoomData = {
  propertyId: '',
  roomNumber: '',
  floor: 1,
  roomType: 'don',
  areaSqm: 0,
  priceMonthly: 0,
  deposit: 0,
  description: '',
  amenities: [],
  images: [],
  landlordNotes: '',
  commission6: 40,
  commission12: 50,
  isAvailable: true,
  isApproved: false,
};

export default function RoomForm({ initialData, properties, onSubmit, isAdmin = false, loading = false }: RoomFormProps) {
  const [form, setForm] = useState<RoomData>(defaultData);
  const [priceDisplay, setPriceDisplay] = useState('');
  const [depositDisplay, setDepositDisplay] = useState('');
  const isEdit = !!initialData?.id;

  useEffect(() => {
    if (initialData) {
      let c6 = 40, c12 = 50;
      if (initialData.commissionJson) {
        try {
          const parsed = typeof initialData.commissionJson === 'string'
            ? JSON.parse(initialData.commissionJson)
            : initialData.commissionJson;
          c6 = parsed['6'] ?? 40;
          c12 = parsed['12'] ?? 50;
        } catch {}
      }

      const data: RoomData = {
        propertyId: initialData.propertyId || '',
        roomNumber: initialData.roomNumber || '',
        floor: initialData.floor || 1,
        roomType: initialData.roomType || 'don',
        areaSqm: initialData.areaSqm || 0,
        priceMonthly: initialData.priceMonthly || 0,
        deposit: initialData.deposit || 0,
        description: initialData.description || '',
        amenities: initialData.amenities || [],
        images: initialData.images || [],
        landlordNotes: initialData.landlordNotes || '',
        commission6: c6,
        commission12: c12,
        isAvailable: initialData.isAvailable ?? true,
        isApproved: initialData.isApproved ?? false,
      };
      setForm(data);
      setPriceDisplay(data.priceMonthly ? formatVndInput(data.priceMonthly) : '');
      setDepositDisplay(data.deposit ? formatVndInput(data.deposit) : '');
    }
  }, [initialData]);

  const updateField = (field: keyof RoomData, value: any) => {
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

  // Format VND input: "3500000" → "3.500.000"
  function formatVndInput(val: number | string): string {
    const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : val;
    if (!num || isNaN(num)) return '';
    return num.toLocaleString('vi-VN');
  }

  function parseVndInput(str: string): number {
    return parseInt(str.replace(/\D/g, ''), 10) || 0;
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseVndInput(raw);
    setPriceDisplay(num ? formatVndInput(num) : '');
    updateField('priceMonthly', num);
  };

  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseVndInput(raw);
    setDepositDisplay(num ? formatVndInput(num) : '');
    updateField('deposit', num);
  };

  // Real-time commission calculation
  const commissionCalc = useMemo(() => {
    const price = form.priceMonthly;
    if (!price) return null;
    const c6Amount = (form.commission6 / 100) * price;
    const c12Amount = (form.commission12 / 100) * price;
    return {
      c6: formatCurrency(c6Amount),
      c12: formatCurrency(c12Amount),
    };
  }, [form.priceMonthly, form.commission6, form.commission12]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.propertyId) return toast.error('Vui lòng chọn tòa nhà');
    if (!form.roomNumber.trim()) return toast.error('Vui lòng nhập số phòng');
    if (!form.roomType) return toast.error('Vui lòng chọn loại phòng');
    if (!form.areaSqm || form.areaSqm <= 0) return toast.error('Vui lòng nhập diện tích');
    if (!form.priceMonthly || form.priceMonthly <= 0) return toast.error('Vui lòng nhập giá thuê');

    const submitData = {
      propertyId: form.propertyId,
      roomNumber: form.roomNumber,
      floor: form.floor,
      roomType: form.roomType,
      areaSqm: form.areaSqm,
      priceMonthly: form.priceMonthly,
      deposit: form.deposit,
      description: form.description,
      amenities: form.amenities,
      images: form.images,
      landlordNotes: form.landlordNotes,
      commissionJson: JSON.stringify({ '6': form.commission6, '12': form.commission12 }),
      isAvailable: form.isAvailable,
      isApproved: form.isApproved,
    };

    onSubmit(submitData);
  };

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
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.district ? ` — ${p.district}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Loại phòng <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={form.roomType}
              onChange={e => updateField('roomType', e.target.value)}
            >
              {ROOM_TYPES.map(rt => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Số phòng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="VD: 301, P.201"
              value={form.roomNumber}
              onChange={e => updateField('roomNumber', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Tầng</label>
            <input
              type="number"
              className="input-field"
              min={1}
              max={50}
              value={form.floor}
              onChange={e => updateField('floor', parseInt(e.target.value) || 1)}
            />
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
        </div>
      </div>

      {/* Section 2: Giá cả */}
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
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Đặt cọc (VNĐ)</label>
            <input
              type="text"
              className="input-field"
              placeholder="VD: 3.500.000"
              value={depositDisplay}
              onChange={handleDepositChange}
            />
            {form.deposit > 0 && (
              <p className="text-xs text-stone-400 mt-1">{formatCurrency(form.deposit)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Mô tả */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Mô tả</h3>
        <textarea
          className="input-field min-h-[80px] resize-y"
          placeholder="Mô tả chi tiết phòng: hướng cửa, view, tình trạng nội thất..."
          value={form.description}
          onChange={e => updateField('description', e.target.value)}
          rows={3}
        />
      </div>

      {/* Section 4: Tiện ích phòng */}
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

      {/* Section 5: Ảnh phòng */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Ảnh phòng</h3>
        <ImageUpload
          images={form.images}
          onChange={urls => updateField('images', urls)}
          maxImages={10}
          folder="rooms"
        />
      </div>

      {/* Section 6: Hoa hồng */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Hoa hồng cho Cộng tác viên</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Khách thuê 6 tháng (%)
            </label>
            <input
              type="number"
              className="input-field"
              min={0}
              max={100}
              value={form.commission6}
              onChange={e => updateField('commission6', parseInt(e.target.value) || 0)}
            />
            {commissionCalc && (
              <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                6 tháng: {form.commission6}% x {formatCurrency(form.priceMonthly)} = {commissionCalc.c6}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Khách thuê 12 tháng (%)
            </label>
            <input
              type="number"
              className="input-field"
              min={0}
              max={100}
              value={form.commission12}
              onChange={e => updateField('commission12', parseInt(e.target.value) || 0)}
            />
            {commissionCalc && (
              <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                12 tháng: {form.commission12}% x {formatCurrency(form.priceMonthly)} = {commissionCalc.c12}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section 7: Lưu ý cho MG */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Lưu ý cho Cộng tác viên</h3>
        <textarea
          className="input-field min-h-[80px] resize-y"
          placeholder="VD: Khách phải đặt cọc 2 tháng, ưu tiên nữ, không nấu nướng..."
          value={form.landlordNotes}
          onChange={e => updateField('landlordNotes', e.target.value)}
          rows={3}
        />
      </div>

      {/* Section 8: Admin controls */}
      {isAdmin && (
        <div className="card">
          <h3 className="text-lg font-semibold text-stone-900 mb-4">Quản trị</h3>
          <div className="flex flex-wrap gap-4">
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
              <span className="text-sm font-medium text-stone-700">Đã duyệt phòng</span>
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
              <span className="text-sm font-medium text-stone-700">Còn phòng trống</span>
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
            isEdit ? 'Cập nhật phòng' : 'Tạo phòng'
          )}
        </button>
      </div>
    </form>
  );
}
