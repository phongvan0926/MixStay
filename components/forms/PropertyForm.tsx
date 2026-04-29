'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ImageUpload from '@/components/ui/ImageUpload';

interface PropertyData {
  id?: string;
  name: string;
  description: string;
  fullAddress: string;
  district: string;
  streetName: string;
  city: string;
  totalFloors: number;
  zaloPhone: string;
  landlordNotes: string;
  amenities: string[];
  images: string[];
  parkingCar: boolean;
  parkingBike: boolean;
  evCharging: boolean;
  petAllowed: boolean;
  foreignerOk: boolean;
  status?: string;
}

interface PropertyFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isAdmin?: boolean;
  loading?: boolean;
  companies?: { id: string; name: string }[];
  landlords?: { id: string; name: string; email?: string }[];
}

const AMENITY_OPTIONS = [
  'Thang máy', 'Bảo vệ 24/7', 'Camera an ninh', 'Wifi miễn phí',
  'Gửi xe miễn phí', 'Máy giặt chung', 'Sân phơi', 'Khoá vân tay',
  'Điện năng lượng mặt trời', 'Nước giếng khoan', 'Phòng sinh hoạt chung',
  'Sân thượng', 'Hầm để xe',
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
  fullAddress: '',
  district: '',
  streetName: '',
  city: 'Hà Nội',
  totalFloors: 1,
  zaloPhone: '',
  landlordNotes: '',
  amenities: [],
  images: [],
  parkingCar: false,
  parkingBike: true,
  evCharging: false,
  petAllowed: false,
  foreignerOk: false,
  status: 'PENDING',
};

export default function PropertyForm({ initialData, onSubmit, isAdmin = false, loading = false, companies = [], landlords = [] }: PropertyFormProps) {
  const [form, setForm] = useState<PropertyData>(defaultData);
  const [companyId, setCompanyId] = useState<string>(initialData?.companyId || '');
  const [landlordId, setLandlordId] = useState<string>(initialData?.landlordId || '');
  const [landlordSearch, setLandlordSearch] = useState('');
  const isEdit = !!initialData?.id;

  const filteredLandlords = landlordSearch.trim()
    ? landlords.filter(l => {
        const q = landlordSearch.toLowerCase();
        return l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q);
      })
    : landlords;

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        description: initialData.description || '',
        fullAddress: initialData.fullAddress || '',
        district: initialData.district || '',
        streetName: initialData.streetName || '',
        city: initialData.city || 'Hà Nội',
        totalFloors: initialData.totalFloors || 1,
        zaloPhone: initialData.zaloPhone || '',
        landlordNotes: initialData.landlordNotes || '',
        amenities: initialData.amenities || [],
        images: initialData.images || [],
        parkingCar: initialData.parkingCar ?? false,
        parkingBike: initialData.parkingBike ?? true,
        evCharging: initialData.evCharging ?? false,
        petAllowed: initialData.petAllowed ?? false,
        foreignerOk: initialData.foreignerOk ?? false,
        status: initialData.status || 'PENDING',
      });
    }
  }, [initialData]);

  const updateField = (field: keyof PropertyData, value: any) => {
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

  const toggleFeature = (key: string) => {
    setForm(prev => ({ ...prev, [key]: !prev[key as keyof PropertyData] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) return toast.error('Vui lòng nhập tên tòa nhà');
    if (!form.fullAddress.trim()) return toast.error('Vui lòng nhập địa chỉ chi tiết');
    if (!form.district.trim()) return toast.error('Vui lòng nhập quận/huyện');
    if (!form.streetName.trim()) return toast.error('Vui lòng nhập tên đường');
    if (isAdmin && !isEdit && !landlordId) return toast.error('Vui lòng chọn chủ nhà cho tòa nhà này');

    onSubmit({
      ...form,
      companyId: companyId || null,
      ...(isAdmin && landlordId ? { landlordId } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Thông tin cơ bản */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Thông tin cơ bản</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Company selector (only for admin with companies) */}
          {isAdmin && companies.length > 0 && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Thuộc công ty</label>
              <select className="input-field" value={companyId} onChange={e => setCompanyId(e.target.value)}>
                <option value="">— Không thuộc công ty nào —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Landlord selector (admin only — required when creating) */}
          {isAdmin && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Chủ nhà {!isEdit && <span className="text-red-500">*</span>}
              </label>
              {landlords.length > 8 && (
                <input
                  type="text"
                  className="input-field mb-2"
                  placeholder="Tìm theo tên hoặc email…"
                  value={landlordSearch}
                  onChange={e => setLandlordSearch(e.target.value)}
                />
              )}
              <select
                className="input-field"
                value={landlordId}
                onChange={e => setLandlordId(e.target.value)}
                disabled={isEdit}
              >
                <option value="">-- Chọn chủ nhà --</option>
                {filteredLandlords.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}{l.email ? ` — ${l.email}` : ''}
                  </option>
                ))}
              </select>
              {isEdit && (
                <p className="text-xs text-stone-400 mt-1">Không thể đổi chủ nhà khi sửa tòa nhà.</p>
              )}
              {!isEdit && landlords.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Chưa có user role LANDLORD nào. Tạo user chủ nhà ở mục Quản lý người dùng trước.</p>
              )}
            </div>
          )}
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Mô tả</label>
            <textarea
              className="input-field min-h-[80px] resize-y"
              placeholder="Mô tả ngắn về tòa nhà..."
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Địa chỉ */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Địa chỉ</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Địa chỉ chi tiết <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Số nhà, ngõ, ngách..."
              value={form.fullAddress}
              onChange={e => updateField('fullAddress', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Quận/Huyện <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="VD: Hoàng Mai"
              value={form.district}
              onChange={e => updateField('district', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Tên đường <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="VD: Lĩnh Nam"
              value={form.streetName}
              onChange={e => updateField('streetName', e.target.value)}
            />
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
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Số tầng</label>
            <input
              type="number"
              className="input-field"
              min={1}
              max={50}
              value={form.totalFloors}
              onChange={e => updateField('totalFloors', parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Liên hệ & Ghi chú */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Liên hệ & Ghi chú cho môi giới</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">SĐT Zalo chủ nhà</label>
            <input
              type="text"
              className="input-field"
              placeholder="VD: 0912345678"
              value={form.zaloPhone}
              onChange={e => updateField('zaloPhone', e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Lưu ý cho môi giới</label>
            <textarea
              className="input-field min-h-[80px] resize-y"
              placeholder="Thông tin riêng dành cho MG: giờ xem phòng, cách liên hệ..."
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

      {/* Section 6: Ảnh tòa nhà */}
      <div className="card">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">Ảnh tòa nhà</h3>
        <ImageUpload
          images={form.images}
          onChange={urls => updateField('images', urls)}
          maxImages={20}
          folder="properties"
        />
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
