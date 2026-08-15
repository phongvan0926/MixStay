'use client';

/**
 * Dải báo "trang đang lọc theo VIỆC CẦN XỬ LÝ nào" — hiện khi admin bấm từ thẻ ở /admin/dashboard.
 *
 * Không có dải này thì admin bấm "🖼️ Tin thiếu ảnh" rồi thấy danh sách chỉ còn 48 dòng mà
 * không biết vì sao, tưởng kho hàng hụt. Nó cũng là lối ra: bấm "Bỏ lọc" là về danh sách đầy đủ.
 */
const ISSUE_TEXT: Record<string, { icon: string; label: string; hint: string }> = {
  'no-image': {
    icon: '🖼️',
    label: 'Tin chưa có ảnh nào',
    hint: 'Khách lướt qua thẻ không ảnh gần như chắc chắn bỏ — bổ sung ảnh để tin có cơ hội.',
  },
  stale: {
    icon: '⏰',
    label: 'Tin 30 ngày không cập nhật',
    hint: 'Nhiều tin trong nhóm này đã cho thuê xong mà quên tắt — hỏi lại chủ nhà rồi chỉnh trạng thái.',
  },
  'overdue-upcoming': {
    icon: '🟡',
    label: 'Tin “sắp trống” đã quá ngày dự kiến',
    hint: 'Đến hạn mà chưa chuyển trạng thái — xác nhận đã trống chưa để khách không hỏi nhầm.',
  },
  'no-geo': {
    icon: '📍',
    label: 'Tòa nhà thiếu toạ độ',
    hint: 'Thiếu toạ độ là KHÔNG lên bản đồ tìm phòng — khách tìm quanh trường sẽ không thấy tòa này. Sửa tòa rồi lưu lại là hệ thống tự ghim.',
  },
};

export default function IssueBanner({ issue, total, onClear }: {
  issue: string;
  /** Số bản ghi khớp, lấy từ pagination của API (KHÔNG đếm mảng đang hiển thị) */
  total?: number;
  onClear: () => void;
}) {
  const meta = ISSUE_TEXT[issue];
  if (!meta) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-start gap-x-3 gap-y-2">
      <span className="text-lg leading-none mt-0.5" aria-hidden="true">{meta.icon}</span>
      <div className="flex-1 min-w-[220px]">
        <p className="text-sm font-semibold text-amber-900">
          Đang lọc: {meta.label}
          {total !== undefined && <span className="font-normal"> · {total.toLocaleString('vi-VN')} mục cần xử lý</span>}
        </p>
        <p className="text-xs text-amber-800 mt-0.5">{meta.hint}</p>
      </div>
      <button type="button" onClick={onClear}
        className="inline-flex items-center min-h-9 px-3 rounded-lg text-xs font-medium border border-amber-300 bg-white text-amber-800 hover:border-amber-500 whitespace-nowrap">
        ✕ Bỏ lọc
      </button>
    </div>
  );
}
