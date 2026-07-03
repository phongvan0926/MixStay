export function formatCurrency(amount: number | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}

// Đơn vị tính mặc định của các dịch vụ tòa nhà quen thuộc (suy từ TÊN dịch vụ) → hiển thị "…đ/số", "…đ/người", "…đ/phòng".
const SERVICE_UNITS: Record<string, string> = {
  'điện': 'số',
  'nước': 'người',
  'dịch vụ chung': 'người',
  'dịch vụ': 'người',
  'internet': 'phòng',
  'wifi': 'phòng',
  'rác': 'người',
  'vệ sinh': 'người',
  'quản lý': 'phòng',
  'thang máy': 'người',
};

/**
 * Hiển thị phí dịch vụ tòa nhà ĐẦY ĐỦ: dấu phân cách hàng nghìn + "đ" + đơn vị tính.
 * - value đã có chữ/ký hiệu (người dùng tự ghi "4.000đ/số") → giữ nguyên.
 * - value chỉ là số ("4000") → format "4.000đ" + đơn vị suy từ tên dịch vụ ("Điện" → /số).
 */
export function formatServiceValue(label: string, value: string | number | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/[^\d.,\s]/.test(raw)) return raw; // đã có đơn vị/chữ → giữ nguyên
  let n = Number(raw.replace(/[.,\s]/g, ''));
  if (!Number.isFinite(n) || n === 0) return raw;
  // Phí dịch vụ luôn ≥ 1.000đ; nhiều bản ghi cũ ghi tắt theo "nghìn" (4 = 4.000, 120 = 120.000) → quy đổi.
  if (n < 1000) n = n * 1000;
  const unit = SERVICE_UNITS[(label || '').trim().toLowerCase()];
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ' + (unit ? '/' + unit : '');
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-red-100 text-red-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    PAID: 'bg-emerald-100 text-emerald-800',
    CANCELLED: 'bg-stone-100 text-stone-600',
  };
  return colors[status] || 'bg-stone-100 text-stone-600';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Từ chối',
    CONFIRMED: 'Đã xác nhận',
    PAID: 'Đã thanh toán',
    CANCELLED: 'Đã huỷ',
  };
  return labels[status] || status;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'Super Admin',
    ADMIN_STAFF: 'Staff',
    BROKER: 'Cộng tác viên',
    LANDLORD: 'Chủ nhà',
    CUSTOMER: 'Khách hàng',
  };
  return labels[role] || role;
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-800',
    ADMIN_STAFF: 'bg-blue-100 text-blue-800',
    BROKER: 'bg-gold-100 text-gold-800',
    LANDLORD: 'bg-brand-100 text-brand-800',
    CUSTOMER: 'bg-blue-100 text-blue-800',
  };
  return colors[role] || 'bg-stone-100 text-stone-600';
}
