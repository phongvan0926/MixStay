'use client';
import { useState, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import RoomTypeForm from '@/components/forms/RoomTypeForm';
import Pagination from '@/components/ui/Pagination';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { useRoomTypes, useProperties, useCompanies } from '@/hooks/useData';
import { SkeletonTable } from '@/components/ui/Skeleton';
import * as XLSX from 'xlsx';

const ROOM_TYPE_LABELS: Record<string, string> = {
  don: 'Phòng đơn', gac_xep: 'Gác xép', '1k1n': '1K1N',
  '2k1n': '2K1N', studio: 'Studio', duplex: 'Duplex',
};

// Excel column mapping
const EXCEL_COLUMNS = [
  { key: 'propertyName', label: 'Tên tòa nhà', required: true },
  { key: 'fullAddress', label: 'Địa chỉ' },
  { key: 'district', label: 'Quận', required: true },
  { key: 'streetName', label: 'Đường' },
  { key: 'city', label: 'Thành phố' },
  { key: 'totalFloors', label: 'Số tầng' },
  { key: 'roomTypeName', label: 'Tên loại phòng', required: true },
  { key: 'typeName', label: 'Kiểu phòng' },
  { key: 'areaSqm', label: 'Diện tích (m²)', required: true },
  { key: 'priceMonthly', label: 'Giá thuê (₫/tháng)', required: true },
  { key: 'deposit', label: 'Đặt cọc (₫)' },
  { key: 'totalUnits', label: 'Số phòng loại này' },
  { key: 'amenities', label: 'Tiện ích (phẩy cách)' },
  { key: 'commission6', label: 'HH 6 tháng (%)' },
  { key: 'commission12', label: 'HH 12 tháng (%)' },
  { key: 'shortTermAllowed', label: 'Cho ngắn hạn (TRUE/FALSE)' },
  { key: 'shortTermMonths', label: 'Số tháng ngắn hạn' },
  { key: 'shortTermPrice', label: 'Giá ngắn hạn (₫/tháng)' },
  { key: 'parkingCar', label: 'Ô tô (TRUE/FALSE)' },
  { key: 'petAllowed', label: 'Pet (TRUE/FALSE)' },
  { key: 'foreignerOk', label: 'Foreigner (TRUE/FALSE)' },
  { key: 'evCharging', label: 'Sạc xe (TRUE/FALSE)' },
];

function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template with sample data
  const headers = EXCEL_COLUMNS.map(c => c.label);
  const sampleRows = [
    ['Tòa Sunrise', '123 Nguyễn Trãi, Thanh Xuân, Hà Nội', 'Thanh Xuân', 'Nguyễn Trãi', 'Hà Nội', 6,
      'Phòng đơn 20m²', 'don', 20, 4500000, 4500000, 5, 'Điều hoà, Nóng lạnh, Tủ lạnh', 40, 50,
      'FALSE', '', '', 'TRUE', 'FALSE', 'FALSE', 'FALSE'],
    ['Tòa Sunrise', '123 Nguyễn Trãi, Thanh Xuân, Hà Nội', 'Thanh Xuân', 'Nguyễn Trãi', 'Hà Nội', 6,
      'Studio 35m²', 'studio', 35, 7000000, 7000000, 3, 'Điều hoà, Nóng lạnh, Bếp, Máy giặt', 40, 50,
      'TRUE', '3', 8000000, 'TRUE', 'FALSE', 'TRUE', 'FALSE'],
    ['Tòa GreenPark', '45 Láng Hạ, Đống Đa, Hà Nội', 'Đống Đa', 'Láng Hạ', 'Hà Nội', 8,
      '1 Khách 1 Ngủ 45m²', '1k1n', 45, 9500000, 9500000, 4, 'Điều hoà, Nóng lạnh, Bếp, Máy giặt, Ban công', 45, 55,
      'TRUE', '6', 11000000, 'TRUE', 'TRUE', 'TRUE', 'TRUE'],
  ];

  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 15) }));

  XLSX.utils.book_append_sheet(wb, ws, 'Dữ liệu');

  // Sheet 2: Instructions
  const instructions = [
    ['HƯỚNG DẪN ĐIỀN FILE EXCEL IMPORT PHÒNG'],
    [],
    ['1. CỘT BẮT BUỘC:'],
    ['   - Tên tòa nhà: tên tòa nhà/chung cư mini'],
    ['   - Quận: quận/huyện (VD: Thanh Xuân, Đống Đa, Cầu Giấy)'],
    ['   - Tên loại phòng: tên hiển thị của loại phòng (VD: Phòng đơn 20m²)'],
    ['   - Diện tích (m²): diện tích phòng, nhập số (VD: 20, 35, 45)'],
    ['   - Giá thuê (₫/tháng): giá cho thuê hàng tháng, nhập số (VD: 4500000)'],
    [],
    ['2. KIỂU PHÒNG (cột "Kiểu phòng"):'],
    ['   - don: Phòng đơn'],
    ['   - gac_xep: Gác xép'],
    ['   - 1k1n: 1 khách 1 ngủ'],
    ['   - 2k1n: 2 khách 1 ngủ'],
    ['   - studio: Studio'],
    ['   - duplex: Duplex'],
    [],
    ['3. TIỆN ÍCH: liệt kê cách nhau bằng dấu phẩy'],
    ['   VD: Điều hoà, Nóng lạnh, Tủ lạnh, Máy giặt, Bếp, Ban công'],
    [],
    ['4. CỘT TRUE/FALSE:'],
    ['   - Nhập TRUE hoặc FALSE (viết hoa)'],
    ['   - Cho ngắn hạn: cho phép thuê ngắn hạn hay không'],
    ['   - Ô tô: có chỗ đỗ ô tô'],
    ['   - Pet: cho phép nuôi thú cưng'],
    ['   - Foreigner: cho người nước ngoài thuê'],
    ['   - Sạc xe: có trạm sạc xe điện'],
    [],
    ['5. HOA HỒNG: nhập số phần trăm (VD: 40 = 40%)'],
    [],
    ['6. TÒA NHÀ TRÙNG TÊN + QUẬN: nếu tòa nhà đã có trong hệ thống (match tên + quận) thì loại phòng sẽ được thêm vào tòa nhà đó.'],
    ['   Nếu chưa có → hệ thống sẽ tự tạo tòa nhà mới (trạng thái Chờ duyệt).'],
    [],
    ['7. LƯU Ý: Xoá các dòng mẫu trước khi import. Chỉ giữ lại header ở dòng 1.'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(instructions);
  ws2['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Hướng dẫn');

  XLSX.writeFile(wb, 'MixStay_Import_Template.xlsx');
}

function parseExcelRow(row: any): Record<string, any> {
  const mapped: Record<string, any> = {};
  EXCEL_COLUMNS.forEach((col, idx) => {
    const value = row[idx];
    mapped[col.key] = value !== undefined && value !== null ? value : '';
  });
  return mapped;
}

function validateRow(row: Record<string, any>, idx: number): string[] {
  const errors: string[] = [];
  if (!row.propertyName) errors.push(`Dòng ${idx + 1}: Thiếu tên tòa nhà`);
  if (!row.district) errors.push(`Dòng ${idx + 1}: Thiếu quận`);
  if (!row.roomTypeName) errors.push(`Dòng ${idx + 1}: Thiếu tên loại phòng`);
  if (!row.areaSqm || isNaN(Number(row.areaSqm))) errors.push(`Dòng ${idx + 1}: Diện tích không hợp lệ`);
  if (!row.priceMonthly || isNaN(Number(row.priceMonthly))) errors.push(`Dòng ${idx + 1}: Giá thuê không hợp lệ`);
  const validTypes = ['don', 'gac_xep', '1k1n', '2k1n', 'studio', 'duplex'];
  if (row.typeName && !validTypes.includes(row.typeName)) errors.push(`Dòng ${idx + 1}: Kiểu phòng không hợp lệ (${row.typeName})`);
  return errors;
}

export default function AdminRoomsPage() {
  // Pagination
  const [page, setPage] = useState(1);

  const { roomTypes: rooms, pagination, isLoading: loading, mutate } = useRoomTypes({ page: String(page), limit: '20' });
  const { properties } = useProperties({ status: 'APPROVED', limit: '200' });
  const { companies } = useCompanies();

  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<Record<string, any>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filterCompany, setFilterCompany] = useState('');
  const [filterProperty, setFilterProperty] = useState('');
  const [filterRoomType, setFilterRoomType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const handlePageChange = (newPage: number) => { setPage(newPage); };

  // Properties filtered by selected company (cascade)
  const filteredProperties = useMemo(() => {
    if (!filterCompany) return properties;
    if (filterCompany === '__none__') return properties.filter(p => !p.companyId);
    return properties.filter(p => p.companyId === filterCompany);
  }, [properties, filterCompany]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      if (filterCompany) {
        const prop = properties.find(p => p.id === r.property?.id);
        if (filterCompany === '__none__' && prop?.companyId) return false;
        if (filterCompany !== '__none__' && prop?.companyId !== filterCompany) return false;
      }
      if (filterProperty && r.property?.id !== filterProperty) return false;
      if (filterRoomType && r.typeName !== filterRoomType) return false;
      if (filterStatus) {
        if (filterStatus === 'available' && !(r.isAvailable && r.availableUnits > 0)) return false;
        if (filterStatus === 'unavailable' && !(r.availableUnits === 0 || !r.isAvailable)) return false;
        if (filterStatus === 'partial' && !(r.availableUnits > 0 && r.availableUnits < r.totalUnits && r.isAvailable)) return false;
      }
      return true;
    });
  }, [rooms, properties, filterCompany, filterProperty, filterRoomType, filterStatus]);

  const openCreate = () => { setEditingRoom(null); setShowModal(true); };
  const openEdit = (room: any) => { setEditingRoom(room); setShowModal(true); };

  const handleFormSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      if (editingRoom) {
        const res = await fetch('/api/rooms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingRoom.id, ...data }) });
        if (res.ok) { toast.success('Đã cập nhật phòng!'); setShowModal(false); mutate(); } else toast.error('Lỗi cập nhật');
      } else {
        const res = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (res.ok) { toast.success('Đã thêm phòng!'); setShowModal(false); mutate(); } else toast.error('Lỗi thêm phòng');
      }
    } finally { setSubmitting(false); }
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    await fetch('/api/rooms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isAvailable: !current }) });
    toast.success(!current ? 'Đã bật phòng' : 'Đã tắt phòng'); mutate();
  };

  const toggleApproval = async (id: string, current: boolean) => {
    await fetch('/api/rooms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isApproved: !current }) });
    toast.success(!current ? 'Đã duyệt phòng' : 'Đã huỷ duyệt'); mutate();
  };

  const getCommissionText = (r: any) => {
    if (!r.commissionJson) return '—';
    try { const c = typeof r.commissionJson === 'string' ? JSON.parse(r.commissionJson) : r.commissionJson; return `${c['6'] ?? '—'}% / ${c['12'] ?? '—'}%`; } catch { return '—'; }
  };

  const getAvailabilityBadge = (r: any) => {
    if (!r.isAvailable || r.availableUnits === 0) {
      return { label: 'Hết phòng', cls: 'bg-red-100 text-red-700' };
    }
    if (r.availableUnits < r.totalUnits) {
      return { label: 'Sắp trống', cls: 'bg-amber-100 text-amber-700' };
    }
    return { label: 'Còn trống', cls: 'bg-emerald-100 text-emerald-700' };
  };

  // === EXCEL FUNCTIONS ===

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast.error('File rỗng hoặc chỉ có header');
        return;
      }

      // Skip header row, parse data rows
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
      const parsed = rows.map(parseExcelRow);

      // Validate
      const errors: string[] = [];
      parsed.forEach((row, idx) => {
        errors.push(...validateRow(row, idx));
      });

      setImportData(parsed);
      setImportErrors(errors);
      setImportResult('');
      setShowImportModal(true);
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportConfirm = async () => {
    if (importErrors.length > 0) {
      toast.error('Vui lòng sửa lỗi trước khi import');
      return;
    }
    setImporting(true);
    try {
      const res = await fetch('/api/rooms/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: importData }),
      });
      const result = await res.json();
      if (res.ok) {
        setImportResult(result.message);
        toast.success(result.message);
        mutate();
      } else {
        toast.error(result.error || 'Lỗi import');
      }
    } finally {
      setImporting(false);
    }
  };

  const exportCurrentData = () => {
    const dataToExport = filteredRooms.map((r: any) => {
      const prop = properties.find(p => p.id === r.property?.id);
      const companyName = companies.find((c: any) => c.id === prop?.companyId)?.name || '';
      let c6 = '', c12 = '';
      try {
        const c = typeof r.commissionJson === 'string' ? JSON.parse(r.commissionJson) : r.commissionJson;
        if (c) { c6 = c['6'] || ''; c12 = c['12'] || ''; }
      } catch { /* ignore */ }

      return [
        r.property?.name || '',
        r.property?.fullAddress || '',
        r.property?.district || '',
        r.property?.streetName || '',
        r.property?.city || '',
        r.property?.totalFloors || '',
        r.name || '',
        r.typeName || '',
        r.areaSqm || '',
        r.priceMonthly || '',
        r.deposit || '',
        r.totalUnits || '',
        (r.amenities || []).join(', '),
        c6, c12,
        r.shortTermAllowed ? 'TRUE' : 'FALSE',
        r.shortTermMonths || '',
        r.shortTermPrice || '',
        r.property?.parkingCar ? 'TRUE' : 'FALSE',
        r.property?.petAllowed ? 'TRUE' : 'FALSE',
        r.property?.foreignerOk ? 'TRUE' : 'FALSE',
        r.property?.evCharging ? 'TRUE' : 'FALSE',
        companyName,
        r.availableUnits || 0,
        r.isAvailable ? 'TRUE' : 'FALSE',
        r.isApproved ? 'TRUE' : 'FALSE',
      ];
    });

    const headers = [
      ...EXCEL_COLUMNS.map(c => c.label),
      'Công ty', 'Phòng trống', 'Đang bật', 'Đã duyệt',
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 14) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách phòng');

    const hasFilters = filterCompany || filterProperty || filterRoomType || filterStatus;
    const filename = hasFilters
      ? `MixStay_Phong_Filtered_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `MixStay_Phong_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`Đã xuất ${dataToExport.length} loại phòng ra Excel`);
  };

  if (loading) return <div className="p-8"><SkeletonTable rows={6} cols={8} /></div>;

  const hasFilters = filterCompany || filterProperty || filterRoomType || filterStatus;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Quản lý phòng</h1>
          <p className="text-sm text-stone-500 mt-1">{rooms.length} loại phòng</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Excel buttons */}
          <button onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200">
            📋 Tải form mẫu
          </button>
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 cursor-pointer">
            📥 Import Excel
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={exportCurrentData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors border border-orange-200">
            📤 Xuất Excel {hasFilters ? '(lọc)' : ''}
          </button>
          <button onClick={openCreate} className="btn-primary">+ Thêm phòng</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select className="input-field w-full sm:!w-auto sm:min-w-[160px]" value={filterCompany}
          onChange={e => { setFilterCompany(e.target.value); setFilterProperty(''); }}>
          <option value="">Tất cả công ty</option>
          <option value="__none__">Chưa gán công ty</option>
          {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input-field w-full sm:!w-auto sm:min-w-[180px]" value={filterProperty} onChange={e => setFilterProperty(e.target.value)}>
          <option value="">Tất cả tòa nhà</option>
          {filteredProperties.map((p: any) => <option key={p.id} value={p.id}>{p.name} — {p.district}</option>)}
        </select>
        <select className="input-field w-full sm:!w-auto sm:min-w-[150px]" value={filterRoomType} onChange={e => setFilterRoomType(e.target.value)}>
          <option value="">Tất cả loại phòng</option>
          {Object.entries(ROOM_TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
        <select className="input-field w-full sm:!w-auto sm:min-w-[140px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="available">Còn trống</option>
          <option value="partial">Sắp trống</option>
          <option value="unavailable">Hết phòng</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setFilterCompany(''); setFilterProperty(''); setFilterRoomType(''); setFilterStatus(''); }}
            className="px-3 py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors">Xoá bộ lọc</button>
        )}
        <span className="self-center text-sm text-stone-400 ml-auto">Hiển thị {filteredRooms.length}/{rooms.length} phòng</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-stone-50/80">
              <tr>
                <th className="table-header">Ảnh</th>
                <th className="table-header">Phòng</th>
                <th className="table-header">Tòa nhà</th>
                <th className="table-header">Công ty</th>
                <th className="table-header">Loại</th>
                <th className="table-header">Diện tích</th>
                <th className="table-header">Giá thuê</th>
                <th className="table-header">Phòng trống</th>
                <th className="table-header">HH 6T/12T</th>
                <th className="table-header">Ngắn hạn</th>
                <th className="table-header">Trạng thái</th>
                <th className="table-header">Duyệt</th>
                <th className="table-header">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredRooms.map((r: any) => {
                const prop = properties.find(p => p.id === r.property?.id);
                const companyName = companies.find((c: any) => c.id === prop?.companyId)?.name;
                const badge = getAvailabilityBadge(r);
                return (
                  <tr key={r.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="table-cell">
                      {r.images && r.images.length > 0 ? (
                        <OptimizedImage src={r.images[0]} alt={r.name} width={48} height={48} className="w-12 h-12 rounded-lg object-cover border border-stone-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 text-lg">🚪</div>
                      )}
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-stone-900">{r.name}</p>
                      {r.availableRoomNames && (
                        <p className="text-[10px] text-stone-400 mt-0.5 max-w-[150px] truncate" title={r.availableRoomNames}>
                          Phòng: {r.availableRoomNames}
                        </p>
                      )}
                    </td>
                    <td className="table-cell">
                      <p className="text-stone-700">{r.property?.name}</p>
                      <p className="text-xs text-stone-400">{r.property?.district}</p>
                    </td>
                    <td className="table-cell">
                      {companyName ? <span className="badge bg-brand-50 text-brand-700 text-[10px]">{companyName}</span> : <span className="text-xs text-stone-400">—</span>}
                    </td>
                    <td className="table-cell">
                      <span className="badge bg-stone-100 text-stone-700">{ROOM_TYPE_LABELS[r.typeName] || r.typeName || '—'}</span>
                    </td>
                    <td className="table-cell">{r.areaSqm}m²</td>
                    <td className="table-cell font-semibold text-brand-600">{formatCurrency(r.priceMonthly)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <span className="text-emerald-600 font-bold">{r.availableUnits}</span>
                        <span className="text-stone-400">/{r.totalUnits}</span>
                      </div>
                    </td>
                    <td className="table-cell"><span className="text-xs text-orange-600 font-medium">{getCommissionText(r)}</span></td>
                    <td className="table-cell">
                      {r.shortTermAllowed ? (
                        <div>
                          <span className="badge bg-violet-100 text-violet-700 text-[10px]">Có</span>
                          {r.shortTermPrice && <p className="text-[10px] text-stone-400 mt-0.5">{formatCurrency(r.shortTermPrice)}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <button onClick={() => toggleAvailability(r.id, r.isAvailable)}
                        className={`badge cursor-pointer transition-colors ${badge.cls} hover:opacity-80`}>
                        {badge.label}
                      </button>
                    </td>
                    <td className="table-cell">
                      <button onClick={() => toggleApproval(r.id, r.isApproved)}
                        className={`badge cursor-pointer transition-colors ${r.isApproved ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                        {r.isApproved ? '✓ Đã duyệt' : 'Chờ duyệt'}
                      </button>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Sửa
                        </button>
                        <button onClick={async () => {
                          if (confirm('Xoá phòng này?')) {
                            await fetch(`/api/rooms?id=${r.id}`, { method: 'DELETE' });
                            toast.success('Đã xoá'); mutate();
                          }
                        }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Xoá</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRooms.length === 0 && (
                <tr><td colSpan={13} className="table-cell text-center text-stone-400 py-12">
                  {rooms.length === 0 ? 'Chưa có phòng nào' : 'Không tìm thấy phòng phù hợp'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && (
        <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={handlePageChange} />
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 z-10">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-20">
              <h2 className="font-display text-lg font-bold text-stone-900">
                {editingRoom ? 'Sửa loại phòng' : 'Thêm loại phòng mới'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-stone-100 transition-colors text-stone-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <RoomTypeForm
                initialData={editingRoom || undefined}
                properties={properties.map((p: any) => ({ id: p.id, name: p.name, district: p.district }))}
                onSubmit={handleFormSubmit}
                isAdmin={true}
                loading={submitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowImportModal(false); setImportResult(''); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto mx-4 z-10">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-20">
              <div>
                <h2 className="font-display text-lg font-bold text-stone-900">Import từ Excel</h2>
                <p className="text-sm text-stone-500">{importData.length} dòng dữ liệu</p>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportResult(''); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-stone-100 transition-colors text-stone-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {/* Errors */}
              {importErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 rounded-xl border border-red-200">
                  <p className="font-semibold text-red-700 mb-2">Có {importErrors.length} lỗi cần sửa:</p>
                  <ul className="list-disc list-inside text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                    {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              {/* Success result */}
              {importResult && (
                <div className="mb-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="font-semibold text-emerald-700">{importResult}</p>
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-x-auto border border-stone-200 rounded-xl">
                <table className="w-full text-sm min-w-[800px]">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">Tòa nhà</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">Quận</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">Loại phòng</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">Kiểu</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">Diện tích</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">Giá thuê</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">Cọc</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">Số phòng</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">Tiện ích</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-stone-600">Ngắn hạn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {importData.map((row, idx) => {
                      const rowErrors = validateRow(row, idx);
                      const hasError = rowErrors.length > 0;
                      return (
                        <tr key={idx} className={hasError ? 'bg-red-50/50' : 'hover:bg-stone-50/50'}>
                          <td className="px-3 py-2 text-stone-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium">{row.propertyName || <span className="text-red-400">—</span>}</td>
                          <td className="px-3 py-2">{row.district || <span className="text-red-400">—</span>}</td>
                          <td className="px-3 py-2">{row.roomTypeName || <span className="text-red-400">—</span>}</td>
                          <td className="px-3 py-2">
                            <span className="badge bg-stone-100 text-stone-600 text-[10px]">
                              {ROOM_TYPE_LABELS[row.typeName] || row.typeName || 'don'}
                            </span>
                          </td>
                          <td className="px-3 py-2">{row.areaSqm ? `${row.areaSqm}m²` : <span className="text-red-400">—</span>}</td>
                          <td className="px-3 py-2 font-medium text-brand-600">
                            {row.priceMonthly ? formatCurrency(Number(row.priceMonthly)) : <span className="text-red-400">—</span>}
                          </td>
                          <td className="px-3 py-2">{row.deposit ? formatCurrency(Number(row.deposit)) : '—'}</td>
                          <td className="px-3 py-2">{row.totalUnits || 1}</td>
                          <td className="px-3 py-2 max-w-[150px] truncate text-xs text-stone-500" title={row.amenities}>{row.amenities || '—'}</td>
                          <td className="px-3 py-2">
                            {row.shortTermAllowed === 'TRUE' || row.shortTermAllowed === true ? (
                              <span className="badge bg-violet-100 text-violet-600 text-[10px]">Có</span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-6">
                <button onClick={() => { setShowImportModal(false); setImportResult(''); }}
                  className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors">
                  Huỷ
                </button>
                {!importResult && (
                  <button
                    onClick={handleImportConfirm}
                    disabled={importing || importErrors.length > 0}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? 'Đang import...' : `Xác nhận import ${importData.length} dòng`}
                  </button>
                )}
                {importResult && (
                  <button onClick={() => { setShowImportModal(false); setImportResult(''); }}
                    className="btn-primary">
                    Đóng
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
