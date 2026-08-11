'use client';
// ⚠️ KHÔNG bọc <DashboardLayout> ở đây — app/{admin,broker,landlord}/layout.tsx đã bọc rồi.
// Bọc hai lần thì mọi thứ nhân đôi: 2 sidebar, `lg:ml-60` cộng dồn (đẩy nội dung lệch phải
// ~240px), `max-w-7xl mx-auto` + padding cộng dồn, và 2 bộ SWR poll thông báo mỗi 30s.
import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import Pagination from '@/components/ui/Pagination';
import ViewingRequestTable from '@/components/leads/ViewingRequestTable';

// Khách xin xem phòng ĐẾN TỪ LINK CỦA CHÍNH CTV NÀY (API tự lọc theo brokerId của session).
// Đây là lý do để CTV chịu gửi link: gửi link → khách để lại SĐT → lead ghi tên mình.
export default function BrokerLeadsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, mutate } = useSWR(
    `/api/viewing-requests?page=${page}&limit=20`, fetcher, { revalidateOnFocus: false }
  );
  const rows = data?.data || [];
  const pagination = data?.pagination;
  const newCount = rows.filter((r: any) => r.status === 'NEW').length;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">📥 Khách xin xem phòng</h1>
        <p className="text-sm text-stone-500 mt-1">
          Khách bấm “Đặt lịch xem phòng” trên link bạn gửi sẽ hiện ở đây, kèm số điện thoại.
          {newCount > 0 && <strong className="text-red-600"> Đang có {newCount} khách chưa gọi.</strong>}
        </p>
      </div>

      {isLoading
        ? <p className="text-stone-400 text-sm py-10 text-center">Đang tải…</p>
        : <ViewingRequestTable rows={rows} mutate={mutate} />}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4"><Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} onPageChange={setPage} /></div>
      )}
    </>
  );
}
