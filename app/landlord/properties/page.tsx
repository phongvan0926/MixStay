'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils';
import PropertyForm from '@/components/forms/PropertyForm';
import QuickRoomTypeForm, { QuickRoomTypeData } from '@/components/forms/QuickRoomTypeForm';

const ROOM_TYPE_LABELS: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1K1N',
  '2k1n': '2K1N', studio: 'Studio', duplex: 'Duplex',
};

export default function LandlordPropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Wizard states
  const [wizardStep, setWizardStep] = useState(1); // 1 = property form, 2 = room types
  const [wizardPropertyData, setWizardPropertyData] = useState<any>(null);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [wizardRoomTypes, setWizardRoomTypes] = useState<QuickRoomTypeData[]>([]);
  const [showRoomForm, setShowRoomForm] = useState(false);

  const fetchData = async () => {
    const [propsRes, statsRes] = await Promise.all([
      fetch('/api/properties'), fetch('/api/dashboard-stats'),
    ]);
    setProperties(await propsRes.json());
    setStats(await statsRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingProperty(null);
    setWizardStep(1);
    setWizardPropertyData(null);
    setCreatedPropertyId(null);
    setWizardRoomTypes([]);
    setShowRoomForm(false);
    setShowModal(true);
  };

  const openEdit = (property: any) => {
    setEditingProperty(property);
    setWizardStep(1);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProperty(null);
    setWizardStep(1);
    setWizardPropertyData(null);
    setCreatedPropertyId(null);
    setWizardRoomTypes([]);
    setShowRoomForm(false);
  };

  // Step 1: Handle property form submit
  const handlePropertySubmit = async (data: any) => {
    setSubmitting(true);
    try {
      if (editingProperty) {
        // Edit mode — just update, no wizard step 2
        const res = await fetch('/api/properties', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingProperty.id, ...data }),
        });
        if (res.ok) {
          toast.success('Đã cập nhật tòa nhà!');
          closeModal();
          fetchData();
        } else {
          toast.error('Lỗi cập nhật');
        }
      } else {
        // Create mode — save property data and go to step 2
        const res = await fetch('/api/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const created = await res.json();
          setWizardPropertyData({ ...data, name: created.name });
          setCreatedPropertyId(created.id);
          setWizardStep(2);
          toast.success('Đã tạo tòa nhà! Bây giờ thêm loại phòng.');
        } else {
          toast.error('Lỗi thêm tòa nhà');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Add room type to the list
  const handleAddRoomType = (data: QuickRoomTypeData) => {
    setWizardRoomTypes(prev => [...prev, data]);
    setShowRoomForm(false);
    toast.success(`Đã thêm "${data.name}"`);
  };

  // Remove room type from wizard list
  const removeRoomType = (index: number) => {
    setWizardRoomTypes(prev => prev.filter((_, i) => i !== index));
  };

  // Step 2: Finish wizard — submit all room types
  const handleFinishWizard = async () => {
    if (wizardRoomTypes.length === 0) {
      // Allow finishing without room types
      toast.success('Đã gửi tòa nhà! Chờ Admin duyệt.');
      closeModal();
      fetchData();
      return;
    }

    setSubmitting(true);
    try {
      let success = 0;
      for (const rt of wizardRoomTypes) {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId: createdPropertyId,
            name: rt.name,
            typeName: rt.typeName,
            areaSqm: rt.areaSqm,
            priceMonthly: rt.priceMonthly,
            deposit: rt.deposit,
            totalUnits: rt.totalUnits,
            availableUnits: rt.totalUnits,
            isAvailable: true,
            amenities: rt.amenities,
            commissionJson: rt.commissionJson,
          }),
        });
        if (res.ok) success++;
      }
      toast.success(`Hoàn tất! Đã tạo ${success} loại phòng. Chờ Admin duyệt.`);
      closeModal();
      fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="animate-pulse text-stone-400 p-8">Đang tải...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Tòa nhà của tôi</h1>
          <p className="text-sm text-stone-500 mt-1">{properties.length} tòa nhà</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Thêm tòa nhà
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-card"><p className="text-xs font-medium text-stone-500 uppercase">Tòa nhà</p><p className="text-xl font-bold mt-1">{stats.totalProperties}</p></div>
          <div className="stat-card"><p className="text-xs font-medium text-stone-500 uppercase">Tổng phòng</p><p className="text-xl font-bold mt-1">{stats.totalRooms}</p></div>
          <div className="stat-card"><p className="text-xs font-medium text-stone-500 uppercase">Phòng trống</p><p className="text-xl font-bold mt-1 text-emerald-600">{stats.availableRooms}</p></div>
          <div className="stat-card"><p className="text-xs font-medium text-stone-500 uppercase">Lượt xem</p><p className="text-xl font-bold mt-1 text-brand-600">{stats.totalViews}</p></div>
        </div>
      )}

      {/* Property cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {properties.map((p: any) => (
          <div key={p.id} className="card-hover overflow-hidden group">
            {/* Cover image */}
            <div className="relative -mx-5 -mt-5 mb-4 h-44 overflow-hidden">
              {p.images && p.images.length > 0 ? (
                <img
                  src={p.images[0]}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
                  <span className="text-5xl opacity-50">🏢</span>
                </div>
              )}
              <div className="absolute top-3 right-3">
                <span className={'badge ' + getStatusColor(p.status)}>{getStatusLabel(p.status)}</span>
              </div>
              {p.images && p.images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                  +{p.images.length - 1} ảnh
                </div>
              )}
            </div>

            {/* Info */}
            <div className="mb-3">
              <h3 className="font-display font-semibold text-lg text-stone-900">{p.name}</h3>
              <p className="text-sm text-stone-500 mt-0.5">{p.fullAddress}</p>
              <p className="text-sm text-stone-400">{p.district} • {p.totalFloors} tầng</p>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 mb-3 text-sm">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-medium">
                {p.roomTypes?.filter((r: any) => r.isAvailable).length} trống
              </span>
              <span className="text-stone-400">/</span>
              <span className="text-stone-600">{p.roomTypes?.length} loại phòng</span>
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {p.zaloPhone && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                  Zalo: {p.zaloPhone}
                </span>
              )}
              {p.parkingCar && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">🚗 Ô tô</span>}
              {p.evCharging && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">⚡ Sạc EV</span>}
              {p.petAllowed && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">🐾 Thú cưng</span>}
              {p.foreignerOk && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">🌍 Nước ngoài</span>}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-stone-100">
              <button
                onClick={() => openEdit(p)}
                className="w-full py-2.5 rounded-xl text-sm font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-all border border-brand-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Chỉnh sửa
              </button>
            </div>
          </div>
        ))}
        {properties.length === 0 && (
          <div className="md:col-span-3 text-center py-16 text-stone-400 card">
            <p className="text-4xl mb-3">🏠</p><p>Nhấn <strong>+ Thêm tòa nhà</strong> để bắt đầu.</p>
          </div>
        )}
      </div>

      {/* Modal — Wizard */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 z-10">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-20">
              <div>
                <h2 className="font-display text-lg font-bold text-stone-900">
                  {editingProperty
                    ? 'Sửa tòa nhà'
                    : wizardStep === 1
                      ? 'Bước 1: Thông tin tòa nhà'
                      : 'Bước 2: Thêm loại phòng'}
                </h2>
                {!editingProperty && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className={`w-8 h-1.5 rounded-full ${wizardStep >= 1 ? 'bg-brand-500' : 'bg-stone-200'}`} />
                    <div className={`w-8 h-1.5 rounded-full ${wizardStep >= 2 ? 'bg-brand-500' : 'bg-stone-200'}`} />
                  </div>
                )}
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-stone-100 transition-colors text-stone-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Step 1: Property form */}
              {wizardStep === 1 && (
                <PropertyForm
                  initialData={editingProperty || undefined}
                  onSubmit={handlePropertySubmit}
                  isAdmin={false}
                  loading={submitting}
                />
              )}

              {/* Step 2: Add room types */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div className="p-4 bg-brand-50 rounded-xl border border-brand-100">
                    <p className="text-sm text-brand-800">
                      Tòa nhà: <strong>{wizardPropertyData?.name}</strong>. Bây giờ thêm các loại phòng:
                    </p>
                  </div>

                  {/* List of added room types */}
                  {wizardRoomTypes.length > 0 && (
                    <div className="space-y-3">
                      {wizardRoomTypes.map((rt, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-xl border border-stone-200">
                          <div>
                            <p className="font-medium text-stone-800">{rt.name}</p>
                            <p className="text-sm text-stone-500">
                              {ROOM_TYPE_LABELS[rt.typeName]} • {rt.areaSqm}m² • {formatCurrency(rt.priceMonthly)}/th • {rt.totalUnits} phòng
                            </p>
                            {rt.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {rt.amenities.slice(0, 5).map(a => (
                                  <span key={a} className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">{a}</span>
                                ))}
                                {rt.amenities.length > 5 && <span className="text-[10px] text-stone-400">+{rt.amenities.length - 5}</span>}
                              </div>
                            )}
                          </div>
                          <button onClick={() => removeRoomType(idx)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline room type form */}
                  {showRoomForm ? (
                    <QuickRoomTypeForm
                      onAdd={handleAddRoomType}
                      onCancel={() => setShowRoomForm(false)}
                    />
                  ) : (
                    <button type="button" onClick={() => setShowRoomForm(true)}
                      className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-sm font-medium text-stone-500 hover:border-brand-400 hover:text-brand-600 transition-all flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      + Thêm loại phòng
                    </button>
                  )}

                  {/* Wizard actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                    <p className="text-sm text-stone-400">
                      {wizardRoomTypes.length === 0 ? 'Bạn có thể thêm loại phòng sau' : `${wizardRoomTypes.length} loại phòng`}
                    </p>
                    <button onClick={handleFinishWizard} disabled={submitting}
                      className="btn-primary px-8">
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Đang lưu...
                        </span>
                      ) : (
                        'Hoàn tất'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
