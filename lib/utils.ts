export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
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
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
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
    ADMIN: 'Quản trị viên',
    BROKER: 'Môi giới',
    LANDLORD: 'Chủ nhà',
    CUSTOMER: 'Khách hàng',
  };
  return labels[role] || role;
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-800',
    BROKER: 'bg-orange-100 text-orange-800',
    LANDLORD: 'bg-amber-100 text-amber-800',
    CUSTOMER: 'bg-blue-100 text-blue-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-600';
}
