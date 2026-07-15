/* MixStay service worker — tối thiểu & AN TOÀN.
 * Mục tiêu: đủ điều kiện "cài đặt" (Android/Chrome cần SW có fetch handler) + mở được khi mất mạng.
 * Nguyên tắc để KHÔNG bao giờ hiện dữ liệu cũ:
 *  - Trang (navigate): network-first, chỉ dùng cache khi offline.
 *  - /api, /_next/data: KHÔNG đụng vào (luôn ra mạng) → dữ liệu/đăng nhập luôn thật.
 *  - Tài nguyên tĩnh băm hash (/_next/static) + ảnh/font: cache-first (an toàn vì URL đổi khi nội dung đổi).
 */
const CACHE = 'mixstay-v1';
const OFFLINE_URLS = ['/', '/manifest.json', '/icon-192.png', '/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(OFFLINE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase / YouTube / … để nguyên

  // Dữ liệu động: luôn ra mạng, không cache
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/_next/data')) return;

  // Điều hướng trang: network-first, offline mới lấy cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Tài nguyên tĩnh: cache-first, nền tự cập nhật
  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|css|js)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
