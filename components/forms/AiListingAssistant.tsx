'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { AI_LISTING_STYLES, DEFAULT_AI_STYLE } from '@/lib/ai-listing-styles';

interface Props {
  // Bối cảnh tin đăng (lấy từ form hiện tại) để AI viết đúng, không bịa.
  name?: string;
  typeName?: string;
  areaSqm?: number;
  priceMonthly?: number;
  deposit?: number;
  amenities?: string[];
  description?: string;
  propertyId?: string;
  // Áp dụng nội dung AL vào ô mô tả của form.
  onApply: (text: string) => void;
}

export default function AiListingAssistant(props: Props) {
  const { onApply } = props;
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(DEFAULT_AI_STYLE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const generate = async () => {
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/ai/listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style,
          name: props.name,
          typeName: props.typeName,
          areaSqm: props.areaSqm,
          priceMonthly: props.priceMonthly,
          deposit: props.deposit,
          amenities: props.amenities,
          description: props.description,
          propertyId: props.propertyId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Không tạo được nội dung');
        return;
      }
      setResult(data.text || '');
    } catch {
      toast.error('Lỗi kết nối, thử lại nhé');
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    onApply(result);
    setResult('');
    setOpen(false);
    toast.success('Đã áp dụng nội dung AI vào ô mô tả');
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-50 to-brand-50 border border-violet-200 text-violet-700 hover:from-violet-100 hover:to-brand-100 transition-all"
      >
        ✨ AI hỗ trợ chuẩn hóa tin đăng
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-violet-800">✨ AI hỗ trợ chuẩn hóa tin đăng</p>
        <button type="button" onClick={() => { setOpen(false); setResult(''); }} className="text-stone-400 hover:text-stone-600 text-sm">✕</button>
      </div>

      {/* Chọn phong cách viết */}
      <p className="text-xs font-medium text-stone-500 mb-1.5">Chọn phong cách viết</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {AI_LISTING_STYLES.map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStyle(s.key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              style === s.key
                ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                : 'bg-white border-stone-200 text-stone-600 hover:border-violet-300'
            }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-all disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Đang viết...
          </>
        ) : result ? '🔄 Viết lại' : '✨ Chuẩn hóa bằng AI'}
      </button>

      {result && (
        <div className="mt-3">
          <p className="text-xs font-medium text-stone-500 mb-1.5">Bản AI đề xuất (xem trước):</p>
          <div className="rounded-lg border border-stone-200 bg-white p-3 max-h-64 overflow-y-auto">
            <p className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">{result}</p>
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={apply}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all">
              ✅ Dùng bản này
            </button>
            <button type="button" onClick={() => setResult('')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 transition-all">
              Bỏ
            </button>
          </div>
          <p className="text-[11px] text-stone-400 mt-1.5">Bạn có thể sửa lại sau khi áp dụng. AI chỉ dùng thông tin bạn nhập, có thể chưa hoàn hảo — hãy kiểm tra số liệu.</p>
        </div>
      )}
    </div>
  );
}
