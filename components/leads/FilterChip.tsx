'use client';

/**
 * Chip lọc kèm SỐ ĐẾM cho trang "Khách để lại thông tin".
 *
 * Số đếm luôn lấy từ API (đếm trên toàn bộ tập dữ liệu), KHÔNG đếm mảng đang hiển thị:
 * danh sách có phân trang nên đếm phía client sẽ bỏ sót khách ở các trang sau — đúng lỗi
 * `newCount` cũ ở trang CTV chỉ đếm 20 dòng của trang hiện tại.
 */
export default function FilterChip({
  active,
  count,
  onClick,
  children,
  tone = 'brand',
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'brand' | 'danger';
}) {
  const activeCls = tone === 'danger'
    ? 'bg-red-600 text-white border-red-600'
    : 'bg-brand-600 text-white border-brand-600';
  const idleCls = tone === 'danger'
    ? 'bg-white text-red-600 border-red-200 hover:border-red-400'
    : 'bg-white text-stone-600 border-stone-200 hover:border-brand-300';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl text-sm font-medium border transition-colors ${active ? activeCls : idleCls}`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`inline-flex items-center justify-center min-w-[20px] px-1 h-5 rounded-full text-[11px] font-semibold ${
            active ? 'bg-white/25 text-white' : 'bg-stone-100 text-stone-500'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
