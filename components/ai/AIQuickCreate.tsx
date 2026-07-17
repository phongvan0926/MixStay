'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { HANOI_DISTRICTS } from '@/lib/hanoi-locations';
import { ROOM_TYPE_OPTIONS } from '@/lib/listing-options';

/**
 * ⚡ Tạo tin nhanh bằng AI — dán tin đăng copy từ Facebook/Zalo:
 *  Bước 1: paste → POST /api/ai/parse-listing (Gemini bóc tách property + room).
 *  Bước 2: review — chọn tòa nhà CÓ SẴN (AI gợi ý match) hoặc sửa & tạo TÒA MỚI ngay tại đây.
 *  Kết thúc: gọi onReady(roomPrefill có propertyId) → trang cha mở RoomTypeForm điền sẵn,
 *  người dùng kiểm tra + bổ sung trường thiếu rồi Lưu như luồng thường (không auto-đăng).
 */

type Parsed = { property: any; room: any; matches: { id: string; name: string; district: string }[] };

const TYPE_LABEL: Record<string, string> = Object.fromEntries(ROOM_TYPE_OPTIONS.map(o => [o.value, o.label]));

export default function AIQuickCreate({
  properties,
  onReady,
}: {
  properties: { id: string; name: string; district?: string }[];
  onReady: (roomPrefill: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);

  // Lựa chọn tòa nhà ở bước review: id có sẵn hoặc '__new__'
  const [propChoice, setPropChoice] = useState('__new__');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<any>({}); // các field tòa mới (sửa được)

  const reset = () => { setText(''); setParsed(null); setPropChoice('__new__'); setDraft({}); };

  const analyze = async () => {
    setParsing(true);
    try {
      const res = await fetch('/api/ai/parse-listing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Không phân tích được'); return; }
      setParsed(data);
      setDraft({ city: 'Hà Nội', ...data.property });
      setPropChoice(data.matches?.[0]?.id || '__new__');
    } catch {
      toast.error('Lỗi mạng, thử lại nhé');
    } finally { setParsing(false); }
  };

  const proceed = async () => {
    if (!parsed) return;
    let propertyId = propChoice;

    if (propChoice === '__new__') {
      // Validate tối thiểu trước khi tạo tòa (khớp propertyCreateSchema)
      if (!draft.name?.trim() || !draft.district || !draft.streetName?.trim() || !draft.fullAddress?.trim()) {
        toast.error('Điền đủ: Tên tòa, Quận/Huyện, Tên đường, Địa chỉ đầy đủ');
        return;
      }
      setCreating(true);
      try {
        const res = await fetch('/api/properties', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: draft.name.trim(),
            district: draft.district,
            streetName: draft.streetName.trim(),
            houseNumber: draft.houseNumber || null,
            fullAddress: draft.fullAddress.trim(),
            city: draft.city || 'Hà Nội',
            zaloPhone: draft.zaloPhone || null,
            parkingCar: !!draft.parkingCar,
            parkingBike: draft.parkingBike !== false,
            evCharging: !!draft.evCharging,
            petAllowed: !!draft.petAllowed,
            foreignerOk: !!draft.foreignerOk,
          }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error || 'Không tạo được tòa nhà'); return; }
        propertyId = data.id;
        toast.success('Đã tạo tòa nhà mới!');
      } catch {
        toast.error('Lỗi mạng khi tạo tòa nhà'); return;
      } finally { setCreating(false); }
    }

    const r = parsed.room || {};
    onReady({
      propertyId,
      name: r.name || '',
      typeName: r.typeName || 'don',
      areaSqm: Number(r.areaSqm) || 0,
      priceMonthly: Number(r.priceMonthly) || 0,
      deposit: Number(r.deposit) || 0,
      description: r.description || '',
      amenities: Array.isArray(r.amenities) && r.amenities.length ? r.amenities : undefined,
      totalUnits: Number(r.totalUnits) || 1,
      availableUnits: Number(r.totalUnits) || 1,
      availableRoomNames: r.availableRoomNames || '',
      shortTermAllowed: !!r.shortTermAllowed,
      shortTermPrice: Number(r.shortTermPrice) || 0,
      status: 'AVAILABLE',
    });
    setOpen(false);
    reset();
  };

  const r = parsed?.room || {};

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-violet-600 to-brand-600 text-white shadow-sm hover:shadow-md hover:-translate-y-px transition-all"
        title="Dán tin đăng từ Facebook/Zalo — AI tự điền form">
        ⚡ Tạo tin nhanh AI
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-8 pb-8">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setOpen(false); reset(); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 z-10">
            <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-20">
              <div>
                <h2 className="font-display text-lg font-bold text-stone-900">⚡ Tạo tin nhanh bằng AI</h2>
                <p className="text-xs text-stone-500 mt-0.5">Dán tin đăng copy từ Facebook/Zalo — AI tự phân loại vào form</p>
              </div>
              <button onClick={() => { setOpen(false); reset(); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-stone-100 transition-colors text-stone-500">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* BƯỚC 1: dán nội dung */}
              {!parsed && (
                <>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={10}
                    placeholder={'Dán nguyên tin đăng vào đây, ví dụ:\n\n🏠 CHO THUÊ CCMN NGÕ 72 HOA BẰNG - CẦU GIẤY\nStudio full nội thất 25m2, giá 5tr5/tháng...\nLH: 09xx xxx xxx'}
                    className="input-field text-sm leading-relaxed"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={analyze} disabled={parsing || text.trim().length < 30}
                      className="btn-primary disabled:opacity-50">
                      {parsing ? '🤖 AI đang đọc tin…' : 'Phân tích bằng AI →'}
                    </button>
                  </div>
                </>
              )}

              {/* BƯỚC 2: review */}
              {parsed && (
                <>
                  {/* Tòa nhà */}
                  <div className="rounded-xl border border-stone-200 p-4">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">🏢 Tòa nhà</p>
                    {parsed.matches.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {parsed.matches.map(m => (
                          <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="radio" name="prop" checked={propChoice === m.id} onChange={() => setPropChoice(m.id)} />
                            <span className="font-medium">{m.name}</span>
                            <span className="text-xs text-stone-400">({m.district}) — tòa có sẵn</span>
                          </label>
                        ))}
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name="prop" checked={propChoice === '__new__'} onChange={() => setPropChoice('__new__')} />
                          <span className="font-medium text-brand-700">➕ Tạo tòa nhà mới</span>
                        </label>
                      </div>
                    )}
                    {propChoice === '__new__' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-stone-500 mb-1">Tên tòa nhà *</label>
                          <input className="input-field text-sm" value={draft.name || ''} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Quận/Huyện *</label>
                          <select className="input-field text-sm" value={draft.district || ''} onChange={e => setDraft({ ...draft, district: e.target.value })}>
                            <option value="">— Chọn —</option>
                            {HANOI_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Tên đường/phố *</label>
                          <input className="input-field text-sm" value={draft.streetName || ''} onChange={e => setDraft({ ...draft, streetName: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Số nhà/ngõ (ẩn với khách)</label>
                          <input className="input-field text-sm" value={draft.houseNumber || ''} onChange={e => setDraft({ ...draft, houseNumber: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">SĐT/Zalo chủ nhà</label>
                          <input className="input-field text-sm" value={draft.zaloPhone || ''} onChange={e => setDraft({ ...draft, zaloPhone: e.target.value })} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-stone-500 mb-1">Địa chỉ đầy đủ *</label>
                          <input className="input-field text-sm" value={draft.fullAddress || ''} onChange={e => setDraft({ ...draft, fullAddress: e.target.value })} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tin đăng — tóm tắt, chỉnh chi tiết ở form sau */}
                  <div className="rounded-xl border border-stone-200 p-4">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">📝 Tin đăng (AI đã điền — kiểm tra ở bước sau)</p>
                    <div className="text-sm space-y-1">
                      <p><span className="text-stone-400">Tiêu đề:</span> <span className="font-medium">{r.name || '—'}</span></p>
                      <p>
                        <span className="text-stone-400">Kiểu:</span> {TYPE_LABEL[r.typeName] || r.typeName || '—'}
                        <span className="text-stone-400 ml-3">DT:</span> {r.areaSqm ? `${r.areaSqm}m²` : '—'}
                        <span className="text-stone-400 ml-3">Giá:</span> <span className="font-semibold text-brand-600">{r.priceMonthly ? formatCurrency(r.priceMonthly) : '⚠️ thiếu'}</span>
                      </p>
                      {Array.isArray(r.amenities) && r.amenities.length > 0 && (
                        <p className="text-xs text-stone-500">🛋 {r.amenities.join(' · ')}</p>
                      )}
                      {r.description && <p className="text-xs text-stone-500 line-clamp-3 whitespace-pre-line">{r.description}</p>}
                    </div>
                  </div>

                  <div className="flex justify-between gap-2">
                    <button onClick={() => setParsed(null)} className="btn-secondary text-sm">← Dán lại</button>
                    <button onClick={proceed} disabled={creating} className="btn-primary disabled:opacity-60">
                      {creating ? 'Đang tạo tòa nhà…' : 'Tiếp tục → Điền form tin đăng'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
