import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';

const SWR_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: 10000,
  keepPreviousData: true,
};

export function useRoomTypes(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : '';
  const { data, error, isLoading, mutate } = useSWR(
    `/api/rooms?${query}`,
    fetcher,
    SWR_OPTIONS
  );
  return {
    roomTypes: (data?.data || data || []) as any[],
    pagination: data?.pagination,
    error,
    isLoading,
    mutate,
  };
}

export function useProperties(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : '';
  const { data, error, isLoading, mutate } = useSWR(
    `/api/properties?${query}`,
    fetcher,
    SWR_OPTIONS
  );
  return {
    properties: (data?.data || data || []) as any[],
    pagination: data?.pagination,
    error,
    isLoading,
    mutate,
  };
}

export function useDeals(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : '';
  const { data, error, isLoading, mutate } = useSWR(
    `/api/deals?${query}`,
    fetcher,
    SWR_OPTIONS
  );
  return {
    deals: (data?.data || data || []) as any[],
    pagination: data?.pagination,
    error,
    isLoading,
    mutate,
  };
}

export function useUsers(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : '';
  const { data, error, isLoading, mutate } = useSWR(
    `/api/users?${query}`,
    fetcher,
    SWR_OPTIONS
  );
  return {
    users: (data?.data || data || []) as any[],
    pagination: data?.pagination,
    error,
    isLoading,
    mutate,
  };
}

// Số liệu TỔNG toàn nền tảng cho trang Quản lý người dùng (không theo trang/bộ lọc)
export function useUserStats() {
  const { data, error, isLoading, mutate } = useSWR('/api/users/stats', fetcher, SWR_OPTIONS);
  return { stats: data as { total: number; active: number; byRole: Record<string, number> } | undefined, error, isLoading, mutate };
}

// Số liệu TỔNG toàn nền tảng cho trang Giao dịch
export function useDealStats() {
  const { data, error, isLoading, mutate } = useSWR('/api/deals/stats', fetcher, SWR_OPTIONS);
  return { stats: data as { total: number; byStatus: Record<string, number>; commissionTotal: number; commissionCompany: number } | undefined, error, isLoading, mutate };
}

export function useShareLinks(params?: Record<string, string>) {
  const query = params ? new URLSearchParams(params).toString() : '';
  const { data, error, isLoading, mutate } = useSWR(
    `/api/share-links?${query}`,
    fetcher,
    SWR_OPTIONS
  );
  return {
    links: (data?.data || data || []) as any[],
    pagination: data?.pagination,
    error,
    isLoading,
    mutate,
  };
}

export function useCompanies() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/companies',
    fetcher,
    SWR_OPTIONS
  );
  return {
    companies: (Array.isArray(data) ? data : []) as any[],
    error,
    isLoading,
    mutate,
  };
}

// Công ty ĐANG HOẠT ĐỘNG + ĐÃ DUYỆT — cho ô CHỌN công ty (chủ nhà đăng tin, CTV lọc). Mọi role gọi được.
export function useActiveCompanies() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/companies?scope=active',
    fetcher,
    SWR_OPTIONS
  );
  return {
    companies: (Array.isArray(data) ? data : []) as { id: string; name: string; logo?: string | null; isApproved?: boolean }[],
    error,
    isLoading,
    mutate,
  };
}

export function useDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/dashboard-stats',
    fetcher,
    SWR_OPTIONS
  );
  return {
    stats: data || null,
    error,
    isLoading,
    mutate,
  };
}

export function useInquiries() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/inquiries',
    fetcher,
    { ...SWR_OPTIONS, onErrorRetry: () => {} }
  );
  return {
    inquiries: (Array.isArray(data) ? data : []) as any[],
    error,
    isLoading,
    mutate,
  };
}
