'use client';
import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '@/lib/utils';
import PropertyForm from '@/components/forms/PropertyForm';
import QuickRoomTypeForm, { QuickRoomTypeData } from '@/components/forms/QuickRoomTypeForm';
import RoomTypeForm from '@/components/forms/RoomTypeForm';
import Pagination from '@/components/ui/Pagination';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { useProperties, useRoomTypes, useInquiries, useDashboardStats } from '@/hooks/useData';
import { SkeletonStats, SkeletonCardGrid } from '@/components/ui/Skeleton';

const ROOM_TYPE_LABELS: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1K1N',
  '2k1n': '2K1N', studio: 'Studio', duplex: 'Duplex',
};

type ViewMode = 'card' | 'list';

// Property-level special amenity icons
function PropertyFeatureBadges({ property }: { property: any }) {
  if (!property) return null;
  const items: { on?: boolean; icon: string; label: string }[] = [
    { on: property.parkingCar, icon: '🚗', label: 'Ô tô đỗ cửa' },
    { on: property.parkingBike, icon: '🏍️', label: 'Để xe máy' },
    { on: property.evCharging, icon: '⚡', label: 'Sạc xe điện' },
    { on: property.petAllowed, icon: '🐾', label: 'Thú cưng OK' },
    { on: property.foreignerOk, icon: '🌍', label: 'Người nước ngoài' },
  ].filter(i => i.on);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(i => (
        <span key={i.label} title={i.label} className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">
          {i.icon} {i.label}
        </span>
      ))}
    </div>
  );
}

export default function LandlordPropertiesPage() {
  const [page, setPage] = useState(1);

  const { properties, pagination, isLoading: loading, mutate: mutateProps } = useProperties({ page: String(page), limit: '20' });
  const { roomTypes, mutate: mutateRT } = useRoomTypes({ limit: '500' });
  const { inquiries, mutate: mutateInquiries } = useInquiries();
  const { stats } = useDashboardStats();

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('landlordViewMode') : null;
    if (saved === 'card' || saved === 'list') setViewMode(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('landlordViewMode', viewMode);
  }, [viewMode]);

  // Property modal (2-step wizard)
  const [showPropModal, setShowPropModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardPropertyData, setWizardPropertyData] = useState<any>(null);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [wizardRoomTypes, setWizardRoomTypes] = useState<QuickRoomTypeData[]>([]);
  const [showQuickRT, setShowQuickRT] = useState(false);

  // RoomType modal (full form)
  const [showRTModal, setShowRTModal] = useState(false);
  const [editingRT, setEditingRT] = useState<any>(null);
  const [preFilledPropId, setPreFilledPropId] = useState<string>('');

  // Inline edit states
  const [editingAvailable, setEditingAvailable] = useState<string | null>(null);
  const [editAvailableUnits, setEditAvailableUnits] = useState(0);
  const [editAvailableNames, setEditAvailableNames] = useState('');

  // Focus after create
  const [focusPropertyId, setFocusPropertyId] = useState<string | null>(null);
  useEffect(() => {
    if (focusPropertyId) {
      const el = document.getElementById(`property-${focusPropertyId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-brand-400');
        setTimeout(() => el.classList.remove('ring-2', 'ring-brand-400'), 2500);
        setFocusPropertyId(null);
      }
    }
  }, [focusPropertyId, properties]);

  const mutate = () => { mutateProps(); mutateRT(); };

  // Group roomTypes by propertyId
  const rtByProperty = useMemo(() => {
    const map: Record<string, any[]> = {};
    roomTypes.forEach((rt: any) => {
      if (!rt.propertyId) return;
      if (!map[rt.propertyId]) map[rt.propertyId] = [];
      map[rt.propertyId].push(rt);
    });
    return map;
  }, [roomTypes]);

  const handlePageChange = (p: number) => setPage(p);

  // === Property handlers ===
  const openCreateProperty = () => {
    setEditingProperty(null);
    setWizardStep(1);
    setWizardPropertyData(null);
    setCreatedPropertyId(null);
    setWizardRoomTypes([]);
    setShowQuickRT(false);
    setShowPropModal(true);
  };
  const openEditProperty = (p: any) => {
    setEditingProperty(p);
    setWizardStep(1);
    setShowPropModal(true);
  };
  const closePropModal = () => {
    setShowPropModal(false);
    setEditingProperty(null);
    setWizardStep(1);
    setWizardPropertyData(null);
    setCreatedPropertyId(null);
    setWizardRoomTypes([]);
    setShowQuickRT(false);
  };

  const handlePropertySubmit = async (data: any) => {
    setSubmitting(true);
    try {
      if (editingProperty) {
        const res = await fetch('/api/properties', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingProperty.id, ...data }),
        });
        if (res.ok) {
          toast.success('Đã cập nhật tòa nhà!');
          closePropModal();
          mutate();
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Lỗi cập nhật');
        }
      } else {
        const res = await fetch('/api/properties', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const created = await res.json();
          setWizardPropertyData({ ...data, name: created.name });
          setCreatedPropertyId(created.id);
          setWizardStep(2);
          toast.success('Đã tạo tòa nhà! Bây giờ thêm tin đăng.');
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Lỗi thêm tòa nhà');
        }
      }
    } finally { setSubmitting(false); }
  };

  const handleAddQuickRT = (data: QuickRoomTypeData) => {
    setWizardRoomTypes(prev => [...prev, data]);
    setShowQuickRT(false);
    toast.success(`Đã thêm "${data.name}"`);
  };
  const removeQuickRT = (idx: number) => {
    setWizardRoomTypes(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFinishWizard = async () => {
    const propId = createdPropertyId;
    if (wizardRoomTypes.length === 0) {
      toast.success('Đã gửi tòa nhà! Chờ Admin duyệt.');
      closePropModal();
      mutate();
      if (propId) setFocusPropertyId(propId);
      return;
    }
    setSubmitting(true);
    try {
      let success = 0;
      for (const rt of wizardRoomTypes) {
        const res = await fetch('/api/rooms', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId: propId,
            name: rt.name,
            typeName: rt.typeName,
            areaSqm: rt.areaSqm,
            priceMonthly: rt.priceMonthly,
            deposit: rt.deposit,
            totalUnits: rt.totalUnits,
            availableUnits: rt.totalUnits,
            status: 'AVAILABLE',
            amenities: rt.amenities,
            commissionJson: rt.commissionJson,
          }),
        });
        if (res.ok) success++;
      }
      toast.success(`Hoàn tất! Đã tạo ${success} tin đăng. Chờ Admin duyệt.`);
      closePropModal();
      mutate();
      if (propId) setFocusPropertyId(propId);
    } finally { setSubmitting(false); }
  };

  // === RoomType handlers ===
  const openCreateRT = (propertyId: string) => {
    setEditingRT(null);
    setPreFilledPropId(propertyId);
    setShowRTModal(true);
  };
  const openEditRT = (rt: any) => {
    setEditingRT(rt);
    setPreFilledPropId('');
    setShowRTModal(true);
  };
  const closeRTModal = () => {
    setShowRTModal(false);
    setEditingRT(null);
    setPreFilledPropId('');
  };

  const handleRTSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      if (editingRT) {
        const res = await fetch('/api/rooms', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingRT.id, ...data }),
        });
        if (res.ok) {
          toast.success('Đã cập nhật tin đăng!');
          closeRTModal();
          mutate();
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Lỗi cập nhật');
        }
      } else {
        const res = await fetch('/api/rooms', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          toast.success('Đã thêm tin đăng! Chờ Admin duyệt.');
          closeRTModal();
          mutate();
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Lỗi thêm tin đăng');
        }
      }
    } finally { setSubmitting(false); }
  };

  // Cycle status: AVAILABLE → UPCOMING → UNAVAILABLE → AVAILABLE
  const cycleStatus = async (id: string, current: 'AVAILABLE' | 'UPCOMING' | 'UNAVAILABLE') => {
    const next: 'AVAILABLE' | 'UPCOMING' | 'UNAVAILABLE' =
      current === 'AVAILABLE' ? 'UPCOMING' : current === 'UPCOMING' ? 'UNAVAILABLE' : 'AVAILABLE';

    const body: any = { id, status: next };
    if (next === 'UPCOMING') {
      const dateStr = prompt('Ngày phòng sẽ trống (YYYY-MM-DD):', new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10));
      if (!dateStr) return;
      body.expectedAvailableDate = new Date(dateStr).toISOString();
    } else {
      body.expectedAvailableDate = null;
    }

    const res = await fetch('/api/rooms', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success(next === 'AVAILABLE' ? '🟢 Còn phòng' : next === 'UPCOMING' ? '🟡 Sắp trống' : '🔴 Hết phòng');
      mutate();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Lỗi cập nhật');
    }
  };

  // Inline edits
  const startEditAvailable = (rt: any) => {
    setEditingAvailable(rt.id);
    setEditAvailableUnits(rt.availableUnits || 0);
    setEditAvailableNames(rt.availableRoomNames || '');
  };
  const saveAvailable = async (id: string) => {
    await fetch('/api/rooms', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, availableUnits: editAvailableUnits, availableRoomNames: editAvailableNames }),
    });
    toast.success('Đã cập nhật phòng trống!');
    setEditingAvailable(null);
    mutate();
  };

  // Share link per room type
  const [sharingRT, setSharingRT] = useState<string | null>(null);
  const shareRoomType = async (rtId: string) => {
    setSharingRT(rtId);
    try {
      const res = await fetch('/api/share-links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomTypeId: rtId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        try { await navigator.clipboard.writeText(data.url); } catch {}
        toast.success('Đã copy link tin đăng!');
      } else {
        toast.error(data.error || 'Không tạo được link');
      }
    } finally { setSharingRT(null); }
  };

  // Inquiry reply
  const replyInquiry = async (inqId: string, reply: string) => {
    await fetch('/api/inquiries', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: inqId, reply }),
    });
    toast.success('Đã phản hồi!');
    mutateInquiries();
  };

  if (loading) return (
    <div className="p-0">
      <SkeletonStats count={4} />
      <div className="mt-6"><SkeletonCardGrid count={6} /></div>
    </div>
  );

  const pendingInquiries = inquiries.filter((i: any) => !i.reply);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Tòa nhà của tôi</h1>
          <p className="text-sm text-stone-500 mt-1">
            {properties.length} tòa nhà • {roomTypes.length} tin đăng
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="inline-flex rounded-xl border border-stone-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode('card')}
              title="Dạng thẻ"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'card' ? 'bg-brand-50 text-brand-700' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h6v6H4zM14 6h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Dạng danh sách"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-brand-50 text-brand-700' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          <button onClick={openCreateProperty} className="btn-primary">+ Thêm tòa nhà</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-card"><p className="text-xs font-medium text-stone-500 uppercase">Tòa nhà</p><p className="text-xl font-bold mt-1">{stats.totalProperties}</p></div>
          <div className="stat-card"><p className="text-xs font-medium text-stone-500 uppercase">Tổng phòng</p><p className="text-xl font-bold mt-1">{stats.totalRooms}</p></div>
          <div className="stat-card"><p className="text-xs font-medium text-stone-500 uppercase">Phòng trống</p><p className="text-xl font-bold mt-1 text-emerald-600">{stats.availableRooms}</p></div>
          <div className="stat-card"><p className="text-xs font-medium text-stone-500 uppercase">Lượt xem</p><p className="text-xl font-bold mt-1 text-brand-600">{stats.totalViews}</p></div>
        </div>
      )}

      {/* Pending inquiries banner */}
      {pendingInquiries.length > 0 && (
        <div className="card mb-6 border-amber-200 bg-amber-50/50">
          <h2 className="font-display font-semibold text-base mb-3">🔔 Môi giới đang hỏi ({pendingInquiries.length})</h2>
          <div className="space-y-2">
            {pendingInquiries.map((inq: any) => (
              <div key={inq.id} className="bg-white rounded-xl p-3 border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{inq.broker?.name} hỏi <strong>{inq.roomType?.name}</strong></p>
                  <p className="text-xs text-stone-500 truncate">{inq.message} • {formatDateTime(inq.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => replyInquiry(inq.id, 'CÒN')}
                    className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200">🟢 CÒN</button>
                  <button onClick={() => replyInquiry(inq.id, 'HẾT')}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200">🔴 HẾT</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Property list */}
      <div className="space-y-6">
        {properties.map((p: any) => {
          const rts = rtByProperty[p.id] || [];
          const availableCount = rts.filter(r => r.status === 'AVAILABLE').length;

          return (
            <div key={p.id} id={`property-${p.id}`} className="card transition-all scroll-mt-20">
              {/* Property header */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="font-display font-semibold text-xl text-stone-900">{p.name}</h2>
                    <span className={'badge ' + getStatusColor(p.status)}>{getStatusLabel(p.status)}</span>
                    {p.company && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-50 border border-brand-100 text-brand-700 text-xs font-medium">
                        🏢 {p.company.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-500">{p.fullAddress}</p>
                  <p className="text-xs text-stone-400">{p.district} • {p.totalFloors} tầng</p>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                      {availableCount} còn phòng
                    </span>
                    <span className="text-stone-400">•</span>
                    <span className="text-xs text-stone-600">{rts.length} tin đăng</span>
                    {p.zaloPhone && (
                      <>
                        <span className="text-stone-400">•</span>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                          Zalo: {p.zaloPhone}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-2">
                    <PropertyFeatureBadges property={p} />
                  </div>
                </div>
                <button
                  onClick={() => openEditProperty(p)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-all border border-brand-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Sửa tòa nhà
                </button>
              </div>

              {/* Room types */}
              <div className="border-t border-stone-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-stone-700">Tin đăng (theo loại phòng) ({rts.length})</h3>
                </div>

                {rts.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-6 bg-stone-50 rounded-xl">
                    Chưa có tin đăng nào. Bấm nút bên dưới để thêm.
                  </p>
                ) : viewMode === 'card' ? (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {rts.map(rt => (
                      <RoomTypeCard
                        key={rt.id}
                        rt={rt}
                        property={p}
                        inquiries={inquiries.filter((i: any) => i.roomTypeId === rt.id && !i.reply)}
                        editingAvailable={editingAvailable}
                        editAvailableUnits={editAvailableUnits}
                        editAvailableNames={editAvailableNames}
                        onStartEdit={() => startEditAvailable(rt)}
                        onCancelEdit={() => setEditingAvailable(null)}
                        onSaveAvailable={() => saveAvailable(rt.id)}
                        onChangeAvailableUnits={setEditAvailableUnits}
                        onChangeAvailableNames={setEditAvailableNames}
                        onEdit={() => openEditRT(rt)}
                        onToggle={() => cycleStatus(rt.id, rt.status || (rt.isAvailable === false ? 'UNAVAILABLE' : 'AVAILABLE'))}
                        onReplyInquiry={replyInquiry}
                        onShare={() => shareRoomType(rt.id)}
                        sharing={sharingRT === rt.id}
                      />
                    ))}
                  </div>
                ) : (
                  <RoomTypeListView
                    rts={rts}
                    property={p}
                    editingAvailable={editingAvailable}
                    editAvailableUnits={editAvailableUnits}
                    editAvailableNames={editAvailableNames}
                    onStartEdit={startEditAvailable}
                    onCancelEdit={() => setEditingAvailable(null)}
                    onSaveAvailable={saveAvailable}
                    onChangeAvailableUnits={setEditAvailableUnits}
                    onChangeAvailableNames={setEditAvailableNames}
                    onEdit={openEditRT}
                    onToggle={cycleStatus}
                    onShare={shareRoomType}
                    sharingId={sharingRT}
                  />
                )}

                {/* Add room type button */}
                <button
                  onClick={() => openCreateRT(p.id)}
                  className="mt-4 w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-sm font-medium text-stone-500 hover:border-brand-400 hover:text-brand-600 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  + Thêm tin đăng vào {p.name}
                </button>
              </div>
            </div>
          );
        })}
        {properties.length === 0 && (
          <div className="text-center py-16 text-stone-400 card">
            <p className="text-4xl mb-3">🏠</p>
            <p>Chưa có tòa nhà nào. Nhấn <strong>+ Thêm tòa nhà</strong> để bắt đầu.</p>
          </div>
        )}
      </div>

      {pagination && (
        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={handlePageChange} />
      )}

      {/* Property Wizard Modal */}
      {showPropModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closePropModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 z-10">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-20">
              <div>
                <h2 className="font-display text-lg font-bold text-stone-900">
                  {editingProperty
                    ? 'Sửa tòa nhà'
                    : wizardStep === 1
                      ? 'Bước 1: Thông tin tòa nhà'
                      : 'Bước 2: Thêm tin đăng'}
                </h2>
                {!editingProperty && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className={`w-8 h-1.5 rounded-full ${wizardStep >= 1 ? 'bg-brand-500' : 'bg-stone-200'}`} />
                    <div className={`w-8 h-1.5 rounded-full ${wizardStep >= 2 ? 'bg-brand-500' : 'bg-stone-200'}`} />
                  </div>
                )}
              </div>
              <button onClick={closePropModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-stone-100 transition-colors text-stone-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {wizardStep === 1 && (
                <PropertyForm
                  initialData={editingProperty || undefined}
                  onSubmit={handlePropertySubmit}
                  isAdmin={false}
                  loading={submitting}
                />
              )}

              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div className="p-4 bg-brand-50 rounded-xl border border-brand-100">
                    <p className="text-sm text-brand-800">
                      Tòa nhà: <strong>{wizardPropertyData?.name}</strong>. Bây giờ thêm các tin đăng:
                    </p>
                  </div>

                  {wizardRoomTypes.length > 0 && (
                    <div className="space-y-3">
                      {wizardRoomTypes.map((rt, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-xl border border-stone-200">
                          <div>
                            <p className="font-medium text-stone-800">{rt.name}</p>
                            <p className="text-sm text-stone-500">
                              {ROOM_TYPE_LABELS[rt.typeName]} • {rt.areaSqm}m² • {formatCurrency(rt.priceMonthly)}/th • {rt.totalUnits} phòng
                            </p>
                          </div>
                          <button onClick={() => removeQuickRT(idx)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showQuickRT ? (
                    <QuickRoomTypeForm
                      onAdd={handleAddQuickRT}
                      onCancel={() => setShowQuickRT(false)}
                    />
                  ) : (
                    <button type="button" onClick={() => setShowQuickRT(true)}
                      className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-sm font-medium text-stone-500 hover:border-brand-400 hover:text-brand-600 transition-all flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      + Thêm tin đăng
                    </button>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-stone-200">
                    <p className="text-sm text-stone-400">
                      {wizardRoomTypes.length === 0 ? 'Bạn có thể thêm tin đăng sau' : `${wizardRoomTypes.length} tin đăng`}
                    </p>
                    <button onClick={handleFinishWizard} disabled={submitting} className="btn-primary px-8">
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Đang lưu...
                        </span>
                      ) : 'Hoàn tất'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RoomType Modal (full form) */}
      {showRTModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeRTModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 z-10">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-20">
              <h2 className="font-display text-lg font-bold text-stone-900">
                {editingRT ? 'Sửa tin đăng' : 'Thêm tin đăng mới'}
              </h2>
              <button onClick={closeRTModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-stone-100 transition-colors text-stone-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <RoomTypeForm
                initialData={editingRT || (preFilledPropId ? { propertyId: preFilledPropId } : undefined)}
                properties={properties.map((p: any) => ({ id: p.id, name: p.name, district: p.district }))}
                onSubmit={handleRTSubmit}
                isAdmin={false}
                loading={submitting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== RoomTypeCard (card view item) ====================
function RoomTypeCard({
  rt, property, inquiries,
  editingAvailable, editAvailableUnits, editAvailableNames,
  onStartEdit, onCancelEdit, onSaveAvailable, onChangeAvailableUnits, onChangeAvailableNames,
  onEdit, onToggle, onReplyInquiry, onShare, sharing,
}: {
  rt: any; property: any; inquiries: any[];
  editingAvailable: string | null; editAvailableUnits: number; editAvailableNames: string;
  onStartEdit: () => void; onCancelEdit: () => void; onSaveAvailable: () => void;
  onChangeAvailableUnits: (n: number) => void; onChangeAvailableNames: (s: string) => void;
  onEdit: () => void; onToggle: () => void;
  onReplyInquiry: (id: string, reply: string) => void;
  onShare: () => void; sharing: boolean;
}) {
  const commission = rt.commissionJson
    ? (typeof rt.commissionJson === 'string' ? JSON.parse(rt.commissionJson) : rt.commissionJson)
    : {};
  const coverImage = rt.images?.[0] || null;
  const isEditingThis = editingAvailable === rt.id;

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden relative">
      {inquiries.length > 0 && (
        <span className="absolute top-2 left-2 z-10 w-6 h-6 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
          {inquiries.length}
        </span>
      )}

      {/* Cover image */}
      <div className="relative h-36 overflow-hidden">
        {coverImage ? (
          <OptimizedImage src={coverImage} alt={rt.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center">
            <span className="text-4xl opacity-50">🏠</span>
          </div>
        )}
        {rt.images?.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
            +{rt.images.length - 1} ảnh
          </div>
        )}
        {!rt.isApproved && (
          <div className="absolute top-2 right-2">
            <span className="badge bg-amber-100 text-amber-700 text-[10px]">Chờ duyệt</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-1.5 gap-2">
          <h4 className="font-semibold text-stone-900 text-sm truncate">{rt.name}</h4>
          <span className="badge bg-stone-100 text-stone-600 text-[10px] shrink-0">
            {ROOM_TYPE_LABELS[rt.typeName] || rt.typeName}
          </span>
        </div>
        <p className="text-xs text-stone-400 mb-1.5">{rt.areaSqm}m²</p>
        <p className="text-base font-bold text-brand-600 mb-2">
          {formatCurrency(rt.priceMonthly)}<span className="text-xs font-normal text-stone-400">/tháng</span>
        </p>

        {/* Availability inline editable */}
        <div className="p-2.5 bg-stone-50 rounded-lg mb-2.5">
          {isEditingThis ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-xs text-stone-500 whitespace-nowrap">Trống:</label>
                <input type="number" className="input-field !py-1 !text-sm w-16" min={0} max={rt.totalUnits}
                  value={editAvailableUnits}
                  onChange={e => onChangeAvailableUnits(Math.min(parseInt(e.target.value) || 0, rt.totalUnits))} />
                <span className="text-xs text-stone-400">/ {rt.totalUnits}</span>
              </div>
              <input type="text" className="input-field !py-1 !text-sm" placeholder="VD: 101, 201"
                value={editAvailableNames}
                onChange={e => onChangeAvailableNames(e.target.value)} />
              <div className="flex gap-1.5">
                <button onClick={onSaveAvailable} className="px-3 py-1 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700">Lưu</button>
                <button onClick={onCancelEdit} className="px-3 py-1 text-stone-500 text-xs hover:text-stone-700">Huỷ</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between cursor-pointer" onClick={onStartEdit}>
              <div className="min-w-0">
                <p className="text-xs font-medium text-stone-700">
                  Trống: <span className="text-emerald-600">{rt.availableUnits}/{rt.totalUnits}</span>
                </p>
                {rt.availableRoomNames && (
                  <p className="text-[11px] text-stone-400 truncate mt-0.5">({rt.availableRoomNames})</p>
                )}
              </div>
              <svg className="w-3.5 h-3.5 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          )}
        </div>

        {/* Commission */}
        {Object.keys(commission).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {Object.entries(commission).map(([m, p]) => (
              <span key={m} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">
                HH {m}th: {String(p)}%
              </span>
            ))}
          </div>
        )}

        {/* Property-level special amenities (outside card display) */}
        <div className="mb-2.5">
          <PropertyFeatureBadges property={property} />
        </div>

        {/* Pending inquiries */}
        {inquiries.length > 0 && (
          <div className="p-2 bg-amber-50 rounded-lg mb-2 border border-amber-100 space-y-1">
            {inquiries.map((inq: any) => (
              <div key={inq.id} className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-amber-800 truncate">{inq.broker?.name}: {inq.message}</p>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => onReplyInquiry(inq.id, 'CÒN')} className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded hover:bg-emerald-200">CÒN</button>
                  <button onClick={() => onReplyInquiry(inq.id, 'HẾT')} className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded hover:bg-red-200">HẾT</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-stone-100 space-y-1.5">
          <button onClick={onShare} disabled={sharing || !rt.isApproved}
            title={rt.isApproved ? 'Chia sẻ link tin đăng' : 'Cần duyệt trước khi chia sẻ'}
            className="w-full py-1.5 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 transition-all border border-violet-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1">
            {sharing ? (
              <>
                <span className="w-3 h-3 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                Đang tạo link...
              </>
            ) : '🔗 Chia sẻ tin đăng'}
          </button>
          <button onClick={onEdit}
            className="w-full py-1.5 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-all border border-brand-200">
            Sửa chi tiết
          </button>
          <button onClick={onToggle}
            title="Bấm để đổi trạng thái: Còn → Sắp trống → Hết → Còn"
            className={'w-full py-1.5 rounded-lg text-xs font-medium transition-all border ' +
              (rt.status === 'UNAVAILABLE'
                ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                : rt.status === 'UPCOMING'
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200')}>
            {rt.status === 'UNAVAILABLE' ? '🔴 Hết phòng' : rt.status === 'UPCOMING' ? '🟡 Sắp trống' : '🟢 Còn phòng'}
            {rt.status === 'UPCOMING' && rt.expectedAvailableDate && (
              <span className="block text-[10px] font-normal mt-0.5 opacity-80">
                từ {new Date(rt.expectedAvailableDate).toLocaleDateString('vi-VN')}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== RoomTypeListView (list view) ====================
function RoomTypeListView({
  rts, property,
  editingAvailable, editAvailableUnits, editAvailableNames,
  onStartEdit, onCancelEdit, onSaveAvailable, onChangeAvailableUnits, onChangeAvailableNames,
  onEdit, onToggle, onShare, sharingId,
}: {
  rts: any[]; property: any;
  editingAvailable: string | null; editAvailableUnits: number; editAvailableNames: string;
  onStartEdit: (rt: any) => void; onCancelEdit: () => void; onSaveAvailable: (id: string) => void;
  onChangeAvailableUnits: (n: number) => void; onChangeAvailableNames: (s: string) => void;
  onEdit: (rt: any) => void; onToggle: (id: string, current: 'AVAILABLE' | 'UPCOMING' | 'UNAVAILABLE') => void;
  onShare: (id: string) => void; sharingId: string | null;
}) {
  return (
    <div className="rounded-xl border border-stone-200 overflow-x-auto">
      <table className="w-full min-w-[800px] text-sm">
        <thead className="bg-stone-50 text-xs text-stone-500 uppercase">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Ảnh</th>
            <th className="px-3 py-2 text-left font-medium">Tên loại</th>
            <th className="px-3 py-2 text-left font-medium">Kiểu</th>
            <th className="px-3 py-2 text-right font-medium">Giá/tháng</th>
            <th className="px-3 py-2 text-center font-medium">Trống</th>
            <th className="px-3 py-2 text-left font-medium">Phòng trống</th>
            <th className="px-3 py-2 text-center font-medium">Trạng thái</th>
            <th className="px-3 py-2 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rts.map(rt => {
            const cover = rt.images?.[0] || null;
            const isEditingRow = editingAvailable === rt.id;

            return (
              <tr key={rt.id} className="border-t border-stone-100 hover:bg-stone-50/50">
                <td className="px-3 py-2">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center shrink-0">
                    {cover ? (
                      <OptimizedImage src={cover} alt={rt.name} fill className="object-cover" sizes="48px" />
                    ) : (
                      <span className="text-xl opacity-50">🏠</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium text-stone-900 text-sm">{rt.name}</p>
                  <p className="text-xs text-stone-400">{rt.areaSqm}m²{!rt.isApproved ? ' • Chờ duyệt' : ''}</p>
                </td>
                <td className="px-3 py-2">
                  <span className="badge bg-stone-100 text-stone-600 text-[10px]">
                    {ROOM_TYPE_LABELS[rt.typeName] || rt.typeName}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-semibold text-brand-600">
                  {formatCurrency(rt.priceMonthly)}
                </td>
                {/* Trống X/Y — inline editable */}
                <td className="px-3 py-2 text-center">
                  {isEditingRow ? (
                    <div className="inline-flex items-center gap-1">
                      <input type="number" className="input-field !py-1 !text-xs w-14 text-center" min={0} max={rt.totalUnits}
                        value={editAvailableUnits}
                        onChange={e => onChangeAvailableUnits(Math.min(parseInt(e.target.value) || 0, rt.totalUnits))} />
                      <span className="text-xs text-stone-400">/{rt.totalUnits}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onStartEdit(rt)}
                      className="inline-flex items-center gap-1 hover:bg-stone-100 rounded px-1.5 py-0.5 transition-colors"
                      title="Bấm để sửa"
                    >
                      <span className="text-emerald-600 font-semibold text-sm">{rt.availableUnits}</span>
                      <span className="text-stone-400 text-xs">/{rt.totalUnits}</span>
                    </button>
                  )}
                </td>
                {/* Phòng trống (names) — inline editable */}
                <td className="px-3 py-2">
                  {isEditingRow ? (
                    <input type="text" className="input-field !py-1 !text-xs w-full min-w-[120px]" placeholder="VD: 101, 201"
                      value={editAvailableNames}
                      onChange={e => onChangeAvailableNames(e.target.value)} />
                  ) : (
                    <button
                      onClick={() => onStartEdit(rt)}
                      className="text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded px-1.5 py-0.5 transition-colors max-w-[200px] truncate text-left block"
                      title="Bấm để sửa"
                    >
                      {rt.availableRoomNames || <span className="text-stone-400 italic">— Chưa điền —</span>}
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => onToggle(rt.id, rt.status || (rt.isAvailable === false ? 'UNAVAILABLE' : 'AVAILABLE'))}
                    title="Bấm để đổi: Còn → Sắp trống → Hết → Còn"
                    className={'inline-flex flex-col items-center px-2 py-1 rounded-lg text-xs font-medium transition-all border ' +
                      (rt.status === 'UNAVAILABLE'
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'
                        : rt.status === 'UPCOMING'
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200')}
                  >
                    <span>
                      {rt.status === 'UNAVAILABLE' ? '🔴 Hết phòng' : rt.status === 'UPCOMING' ? '🟡 Sắp trống' : '🟢 Còn phòng'}
                    </span>
                    {rt.status === 'UPCOMING' && rt.expectedAvailableDate && (
                      <span className="text-[9px] opacity-80">
                        từ {new Date(rt.expectedAvailableDate).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  {isEditingRow ? (
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => onSaveAvailable(rt.id)} className="px-2 py-1 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700">Lưu</button>
                      <button onClick={onCancelEdit} className="px-2 py-1 text-stone-500 text-xs hover:text-stone-700">Huỷ</button>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => onShare(rt.id)} disabled={sharingId === rt.id || !rt.isApproved}
                        title={rt.isApproved ? 'Copy link tin đăng' : 'Cần duyệt trước'}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 disabled:opacity-50 disabled:cursor-not-allowed">
                        {sharingId === rt.id ? '…' : '🔗'}
                      </button>
                      <button onClick={() => onEdit(rt)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200">
                        Sửa
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
