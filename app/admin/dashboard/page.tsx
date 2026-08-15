'use client';
import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatListingCode } from '@/lib/listing-code';
import { SkeletonStats, SkeletonText } from '@/components/ui/Skeleton';
import Avatar from '@/components/ui/Avatar';

/**
 * TRUNG TÂM ĐIỀU HÀNH của admin.
 *
 * Trước đây "Tổng quan" và "Tòa nhà" cùng trỏ /admin/properties, nên các thẻ số toàn hệ thống
 * nằm chung trang với bảng CÓ BỘ LỌC — lọc 1 công ty còn 1 tòa nhưng thẻ vẫn ghi 466 tòa,
 * rất dễ đọc nhầm. Tách hẳn ra đây, và xếp theo thứ tự VIỆC GẤP TRƯỚC, SỐ ĐỂ NGẮM SAU.
 */

/** Chiều cao vùng vẽ cột của biểu đồ (px) — cột cao nhất chiếm trọn chừng này. */
const BAR_AREA = 140;

/** Ô "việc cần làm": =0 thì làm mờ để không tranh chú ý với việc đang thật sự tồn đọng. */
function TodoCard({ href, icon, label, value, tone = 'brand' }: {
  href: string; icon: string; label: string; value: number | null; tone?: 'brand' | 'amber' | 'red';
}) {
  if (value === null) return null;
  const active = value > 0;
  const toneClass = !active
    ? 'border-stone-200 bg-stone-50/60 text-stone-400'
    : tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300'
        : 'border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-300';
  return (
    <Link href={href} className={`block rounded-2xl border p-4 transition-colors ${toneClass}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="text-base">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <p className={`mt-1 font-display text-3xl font-bold ${active ? '' : 'text-stone-300'}`}>{value}</p>
    </Link>
  );
}

/**
 * CUNG ↔ CẦU THEO QUẬN — trả lời "đẩy CTV đi gom hàng ở đâu, ngừng ôm hàng ở đâu".
 *
 * Chỉ số là "bao nhiêu TIN mới đẻ ra 1 KHÁCH hỏi" trong 90 ngày: càng THẤP thì khách càng
 * tranh nhau, kho càng mỏng → gom thêm gấp. Quận không ra khách nào thì không phải "tốt",
 * mà là vốn chết — xếp riêng xuống dưới. Đo 14/08/2026: Hai Bà Trưng 27 tin ra 15 khách
 * (1.8), Cầu Giấy 134 tin ra 4 khách (33.5).
 */
function SupplyDemandCard({ rows }: { rows: any[] }) {
  if (!rows.length) return null;
  const hot = rows.filter(r => r.tinMoiKhach !== null).slice(0, 6);
  const dead = rows.filter(r => r.tinMoiKhach === null && r.tin >= 10);

  return (
    <section>
      <h2 className="font-display font-semibold mb-3">Cung ↔ cầu theo quận (90 ngày)</h2>
      <div className="card p-5">
        <p className="text-xs text-stone-500 mb-3">
          Số nhỏ = khách tranh nhau, kho mỏng → <strong className="text-stone-700">gom thêm hàng</strong>.
          Số lớn = ôm nhiều tin mà ít khách hỏi.
        </p>
        <div className="space-y-2">
          {hot.map((r, i) => {
            // 3 quận cháy nhất tô đỏ — đây là chỗ cần hàng ngay, không phải chỗ "đang tốt"
            const urgent = i < 3;
            return (
              <div key={r.district} className="flex items-center gap-3">
                <span className="text-sm text-stone-700 w-28 shrink-0 truncate">{r.district}</span>
                <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${urgent ? 'bg-red-500' : 'bg-brand-400'}`}
                    style={{ width: `${Math.max(4, Math.min(100, (1 / r.tinMoiKhach) * 100))}%` }} />
                </div>
                <span className={`text-xs font-semibold w-32 shrink-0 text-right ${urgent ? 'text-red-600' : 'text-stone-500'}`}>
                  {r.tin} tin / {r.khach} khách
                </span>
              </div>
            );
          })}
        </div>
        {dead.length > 0 && (
          <div className="mt-4 pt-3 border-t border-stone-100">
            <p className="text-xs text-stone-500">
              <strong className="text-amber-700">Ôm hàng mà 90 ngày không một khách hỏi:</strong>{' '}
              {dead.map(r => `${r.district} (${r.tin} tin)`).join(' · ')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/** Dòng "sức khoẻ kho hàng": tốt thì ✓ xanh, có vấn đề thì hiện số + lối đi xử lý. */
function HealthRow({ label, bad, good, href, unit = 'tin' }: {
  label: string; bad: number; good: string; href?: string; unit?: string;
}) {
  const body = (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-stone-100 last:border-0">
      <span className="text-sm text-stone-600">{label}</span>
      {bad > 0 ? (
        <span className="text-sm font-semibold text-amber-700 whitespace-nowrap">
          {bad.toLocaleString('vi-VN')} {unit} {href && <span className="text-brand-600">→</span>}
        </span>
      ) : (
        <span className="text-sm font-medium text-emerald-600 whitespace-nowrap">✓ {good}</span>
      )}
    </div>
  );
  return href && bad > 0 ? <Link href={href} className="block hover:bg-stone-50 -mx-2 px-2 rounded-lg">{body}</Link> : body;
}

export default function AdminDashboardPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/overview', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
  const [busyInquiry, setBusyInquiry] = useState<string | null>(null);

  /**
   * Trả lời hộ chủ nhà (CTV nhận thông báo ngay) hoặc bỏ qua (chỉ dọn danh sách này).
   * Trả lời xong / bỏ qua xong thì mục tự biến mất vì API chỉ trả câu chưa xử lý.
   */
  const handleInquiry = async (id: string, action: 'CÒN' | 'HẾT' | 'dismiss') => {
    if (action === 'HẾT' && !confirm('Trả lời HẾT sẽ gỡ tin này khỏi thị trường (chuyển 🔴 Hết phòng). Tiếp tục?')) return;
    setBusyInquiry(id);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'dismiss' ? { id, dismiss: true } : { id, reply: action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || 'Không lưu được');
        return;
      }
      toast.success(
        action === 'dismiss'
          ? 'Đã bỏ qua — cộng tác viên không nhận thông báo'
          : `Đã trả lời "${action}" — đã báo cho cộng tác viên`,
      );
      mutate();
    } finally {
      setBusyInquiry(null);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold mb-6">Tổng quan</h1>
        <SkeletonStats count={6} />
        <div className="card mt-6"><SkeletonText lines={5} /></div>
      </div>
    );
  }
  if (error || !data || data.error) {
    return (
      <div className="card p-6">
        <p className="font-semibold text-stone-800">Không tải được số liệu tổng quan</p>
        <p className="text-sm text-stone-500 mt-1">Thử tải lại trang. Nếu vẫn lỗi, báo kỹ thuật kiểm tra API.</p>
      </div>
    );
  }

  const { todo, health, pulse, totals, badPhones } = data;
  const totalTodo =
    todo.pendingRooms + todo.pendingProperties + (todo.pendingCompanies || 0) +
    todo.activeLeads + todo.openInquiries + todo.newViewingRequests;
  const maxWeek = Math.max(...pulse.weekly.map((w: any) => w.tin), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Tổng quan</h1>
        <p className="text-sm text-stone-500 mt-1">
          {totalTodo > 0
            ? `Đang có ${totalTodo} việc chờ bạn xử lý`
            : 'Không có việc nào tồn đọng — hệ thống đang sạch'}
        </p>
      </div>

      {/* ① VIỆC CẦN LÀM */}
      <section>
        <h2 className="font-display font-semibold mb-3">Việc cần làm</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Khách xin xem phòng lên đầu: lead nóng nhất, chậm gọi là mất khách */}
          <TodoCard href="/admin/leads?tab=xem-phong" icon="📅" label="Khách xin xem phòng" value={todo.newViewingRequests} tone="red" />
          <TodoCard href="/admin/rooms?approved=false" icon="📝" label="Tin chờ duyệt" value={todo.pendingRooms} tone="amber" />
          <TodoCard href="/admin/properties?status=PENDING" icon="🏢" label="Tòa chờ duyệt" value={todo.pendingProperties} tone="amber" />
          <TodoCard href="/admin/companies?approved=false" icon="🏛️" label="Công ty chờ duyệt" value={todo.pendingCompanies} tone="amber" />
          <TodoCard href="/admin/leads?tab=san-phong" icon="🔔" label="Khách săn phòng" value={todo.activeLeads} tone="brand" />
          <TodoCard href="/admin/dashboard#hoi-phong" icon="💬" label="Hỏi phòng chưa trả lời" value={todo.openInquiries} tone="red" />
          <TodoCard href="/admin/rooms?issue=no-image" icon="🖼️" label="Tin thiếu ảnh" value={health.roomsNoImage} tone="red" />
        </div>

        {/* Danh sách hỏi phòng hiện ngay tại đây — số lượng ít, không đáng dựng trang riêng */}
        {todo.inquiries?.length > 0 && (
          <div id="hoi-phong" className="card mt-4 p-5">
            <h3 className="font-semibold mb-3">💬 Cộng tác viên đang hỏi phòng ({todo.openInquiries})</h3>
            <div className="space-y-3">
              {todo.inquiries.map((q: any) => (
                <div key={q.id} className="flex items-start gap-3 pb-3 border-b border-stone-100 last:border-0 last:pb-0">
                  <Avatar name={q.broker?.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium text-stone-800">{q.broker?.name || 'Cộng tác viên'}</span>
                      <span className="text-stone-400"> · {formatDate(q.createdAt)}</span>
                    </p>
                    <p className="text-sm text-stone-600 mt-0.5">{q.message || 'Hỏi tình trạng phòng'}</p>
                    {q.roomType && (
                      <Link href={`/tin/${q.roomType.id}`} target="_blank"
                        className="text-xs text-brand-600 hover:underline mt-1 inline-block">
                        {q.roomType.name}
                        {q.roomType.listingCode ? ` · ${formatListingCode(q.roomType.listingCode)}` : ''} ↗
                      </Link>
                    )}

                    {/* Trả lời hộ chủ nhà — CTV nhận thông báo ngay; hoặc bỏ qua để dọn danh sách */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <button
                        onClick={() => handleInquiry(q.id, 'CÒN')}
                        disabled={busyInquiry === q.id}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        🟢 Còn phòng
                      </button>
                      <button
                        onClick={() => handleInquiry(q.id, 'HẾT')}
                        disabled={busyInquiry === q.id}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        🔴 Hết phòng
                      </button>
                      <button
                        onClick={() => handleInquiry(q.id, 'dismiss')}
                        disabled={busyInquiry === q.id}
                        className="px-3 py-1.5 text-xs rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-50"
                        title="Ẩn khỏi danh sách này, không gửi thông báo cho cộng tác viên"
                      >
                        Bỏ qua
                      </button>
                      {busyInquiry === q.id && <span className="text-xs text-stone-400">Đang lưu…</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ② SỨC KHOẺ KHO HÀNG */}
      <section>
        <BadPhonesCard data={badPhones} onDone={mutate} />

        <h2 className="font-display font-semibold mb-3">Sức khoẻ kho hàng</h2>
        <div className="card p-5">
          {/* MỌI dòng có việc phải dẫn tới ĐÚNG danh sách đã lọc sẵn — xem quy tắc trong CLAUDE.md.
              Số ở đây và số trên trang đích phải khớp: cùng điều kiện, cùng nguồn đếm. */}
          <HealthRow label="Tin chưa có ảnh nào (khách lướt qua sẽ bỏ)" bad={health.roomsNoImage}
            good="mọi tin đều có ảnh" href="/admin/rooms?issue=no-image" />
          <HealthRow label="Tòa nhà chưa gán công ty" bad={health.propsNoCompany}
            good="mọi tòa đã có công ty" href="/admin/properties?companyId=__none__" unit="tòa" />
          <HealthRow label="Tòa nhà thiếu toạ độ (không lên bản đồ)" bad={health.propsNoGeo}
            good={`${totals.totalProperties}/${totals.totalProperties} tòa đã có pin bản đồ`}
            href="/admin/properties?issue=no-geo" unit="tòa" />
          <HealthRow label="Tin 30 ngày không cập nhật (có thể đã hết phòng)" bad={health.staleRooms}
            good="kho hàng đang được cập nhật đều" href="/admin/rooms?issue=stale" />
          <HealthRow label="Tin “sắp trống” đã quá ngày dự kiến" bad={health.overdueUpcoming}
            good="cron vòng đời đang chạy đúng" href="/admin/rooms?issue=overdue-upcoming" />
        </div>
      </section>

      {/* ②b CUNG ↔ CẦU THEO QUẬN — đi gom hàng ở đâu */}
      <SupplyDemandCard rows={data.supplyDemand || []} />

      {/* ③ NHỊP KINH DOANH */}
      <section>
        <h2 className="font-display font-semibold mb-3">Nhịp kinh doanh</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-semibold">Tin đăng mới theo tuần</h3>
              <span className="text-xs text-stone-400">8 tuần gần nhất</span>
            </div>
            {pulse.weekly.length === 0 ? (
              <p className="text-sm text-stone-400">Chưa có tin nào trong 8 tuần qua.</p>
            ) : (
              // Chiều cao tính bằng PIXEL, không dùng %: cột con nằm trong flex nên % không
              // có mốc chiều cao để quy chiếu → trước đó biểu đồ ra trắng trơn, không cột nào.
              <div className="flex items-end gap-2" style={{ height: BAR_AREA + 34 }}>
                {pulse.weekly.map((w: any) => (
                  <div key={w.tuan} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <span className="text-xs font-medium text-stone-600">{w.tin}</span>
                    <div
                      className="w-full bg-brand-500 rounded-t-md transition-all"
                      style={{ height: Math.max(Math.round((w.tin / maxWeek) * BAR_AREA), w.tin > 0 ? 6 : 2) }}
                    />
                    <span className="text-[10px] text-stone-400 truncate w-full text-center">{w.tuan}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-stone-100">
              <div>
                <p className="text-xs text-stone-500">Lượt xem tin đăng</p>
                <p className="font-display text-xl font-bold">{pulse.totalViews.toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Lượt xem link chia sẻ</p>
                <p className="font-display text-xl font-bold">{pulse.linkViews.toLocaleString('vi-VN')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Công ty nhiều tin nhất</h3>
              {pulse.topCompanies.length === 0 ? (
                <p className="text-sm text-stone-400">Chưa có dữ liệu.</p>
              ) : (
                <div className="space-y-2">
                  {pulse.topCompanies.map((c: any, i: number) => (
                    <Link key={c.id} href={`/admin/properties?companyId=${c.id}`}
                      className="flex items-center gap-3 py-1.5 hover:bg-stone-50 -mx-2 px-2 rounded-lg">
                      <span className="text-xs text-stone-400 w-4">{i + 1}</span>
                      <span className="flex-1 text-sm text-stone-700 truncate">{c.name}</span>
                      <span className="text-sm font-semibold text-stone-900">{c.tin}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold mb-3">Tin được xem nhiều nhất</h3>
              {pulse.topRooms.length === 0 ? (
                <p className="text-sm text-stone-400">Chưa có lượt xem nào.</p>
              ) : (
                <div className="space-y-2">
                  {pulse.topRooms.map((r: any) => (
                    <Link key={r.id} href={`/tin/${r.id}`} target="_blank"
                      className="flex items-center gap-3 py-1.5 hover:bg-stone-50 -mx-2 px-2 rounded-lg">
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-stone-700 truncate">{r.name}</span>
                        <span className="block text-xs text-stone-400">{r.property?.district}</span>
                      </span>
                      <span className="text-sm font-semibold text-stone-900 whitespace-nowrap">👁 {r.viewCount}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-stone-400 mt-3">
          7 ngày qua: <strong className="text-stone-600">{pulse.newRooms7d}</strong> tin đăng mới ·{' '}
          <strong className="text-stone-600">{pulse.newUsers7d}</strong> người dùng mới
        </p>
      </section>

      {/* ④ SỐ TỔNG — để cuối vì gần như không đổi theo ngày */}
      <section>
        <h2 className="font-display font-semibold mb-3">Số liệu toàn hệ thống</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tòa nhà', value: totals.totalProperties, icon: '🏢', href: '/admin/properties' },
            { label: 'Phòng trống', value: `${totals.availableRooms}/${totals.totalRooms}`, icon: '🚪', href: '/admin/rooms' },
            { label: 'Công ty', value: totals.totalCompanies, icon: '🏛️', href: '/admin/companies' },
            { label: 'Giao dịch', value: `${totals.confirmedDeals}/${totals.totalDeals}`, icon: '📋', href: '/admin/deals' },
            { label: 'Cộng tác viên', value: totals.totalBrokers, icon: '🤝', href: '/admin/users' },
            { label: 'Chủ nhà', value: totals.totalLandlords, icon: '🏠', href: '/admin/users' },
            {
              label: 'Doanh thu HH', icon: '💰', href: '/admin/deals',
              value: totals.totalRevenue == null ? '—' : formatCurrency(totals.totalRevenue),
            },
            {
              label: 'Tổng hoa hồng', icon: '💵', href: '/admin/deals',
              value: totals.totalCommission == null ? '—' : formatCurrency(totals.totalCommission),
            },
          ].map(s => (
            <Link key={s.label} href={s.href} className="stat-card hover:shadow-md transition-shadow">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">{s.label}</p>
              <p className="font-display text-2xl font-bold mt-1">{s.value}</p>
              <span className="text-lg">{s.icon}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * ⚠️ SĐT sai định dạng — khách bấm gọi/Zalo vào đó không tới được ai.
 * Công ty KHÔNG có tài khoản để tự xác nhận nên admin bấm hộ; CTV/chủ nhà thì
 * còn được nhắc bằng banner riêng trên trang của họ (PhoneWarningBanner).
 */
function BadPhonesCard({ data, onDone }: { data?: { companies: any[]; users: any[] }; onDone: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const companies = data?.companies || [];
  const users = data?.users || [];
  if (!companies.length && !users.length) return null;

  const confirmCompany = async (id: string, name: string) => {
    setBusy(id);
    const res = await fetch('/api/companies', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, phoneConfirmed: true }),
    });
    setBusy(null);
    if (res.ok) { toast.success(`Đã xác nhận số của ${name}`); onDone(); }
    else toast.error('Không lưu được');
  };

  return (
    <section className="mb-8">
      <h2 className="font-display font-semibold mb-3">⚠️ Số điện thoại sai định dạng</h2>
      <div className="card p-5 border-amber-300 bg-amber-50/60">
        <p className="text-sm text-amber-900 mb-4">
          {companies.length + users.length} số dưới đây khách <strong>bấm gọi hoặc nhắn Zalo sẽ không tới nơi</strong>.
          Sửa lại, hoặc bấm &ldquo;Số này đúng&rdquo; nếu thực sự dùng được để thôi nhắc.
        </p>
        <div className="space-y-2">
          {companies.map(c => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 justify-between bg-white rounded-xl px-4 py-2.5 border border-amber-200">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">🏢 {c.name}</p>
                <p className="text-xs text-stone-500">
                  <span className="font-mono">{c.phone}</span> — {c.reason}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/admin/companies" className="text-xs font-medium text-brand-600 hover:underline">Sửa</Link>
                <button type="button" onClick={() => confirmCompany(c.id, c.name)} disabled={busy === c.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 disabled:opacity-60">
                  {busy === c.id ? 'Đang lưu…' : 'Số này đúng'}
                </button>
              </div>
            </div>
          ))}
          {users.map(u => (
            <div key={u.id} className="flex flex-wrap items-center gap-2 justify-between bg-white rounded-xl px-4 py-2.5 border border-amber-200">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">
                  👤 {u.name || u.email || 'Không tên'} <span className="text-xs font-normal text-stone-400">{u.role}</span>
                </p>
                <p className="text-xs text-stone-500">
                  <span className="font-mono">{u.phone}</span> — {u.reason}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/admin/users" className="text-xs font-medium text-brand-600 hover:underline">Sửa</Link>
                <span className="text-xs text-stone-400">tự xác nhận khi họ đăng nhập</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
