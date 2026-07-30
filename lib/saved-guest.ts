'use client';

// LƯU TIN CHO KHÁCH VÃNG LAI — không cần tài khoản.
//
// Khách phân khúc này xem hàng chục phòng trong một buổi và hầu như không ai chịu đăng ký
// chỉ để "lưu tin". Vì vậy lưu bằng localStorage ngay trên máy khách: bấm ❤ là xong,
// mở /da-luu để xem lại + so sánh cạnh nhau. Dữ liệu chỉ là DANH SÁCH ID — nội dung tin
// luôn fetch mới từ API public nên không lo hiện giá cũ.
//
// Đồng bộ giữa các component (tim trên thẻ, thanh so sánh nổi, trang /da-luu) bằng một
// custom event trên window — không cần context/provider.

const KEY = 'mixstay:saved-listings';
const EVENT = 'mixstay:saved-changed';
const MAX = 30; // đủ cho một buổi đi tìm phòng, tránh phình localStorage

export function getSavedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter(x => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
  } catch { /* private mode: bỏ qua */ }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function isSaved(id: string): boolean {
  return getSavedIds().includes(id);
}

/** Bật/tắt lưu 1 tin. Trả về trạng thái SAU khi bấm (true = đang lưu). */
export function toggleSaved(id: string): boolean {
  const ids = getSavedIds();
  if (ids.includes(id)) {
    write(ids.filter(x => x !== id));
    return false;
  }
  write([id, ...ids]); // mới lưu lên đầu
  return true;
}

export function removeSaved(id: string) {
  write(getSavedIds().filter(x => x !== id));
}

/** Đăng ký nghe thay đổi (cùng tab qua custom event + tab khác qua storage event). */
export function onSavedChange(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}
