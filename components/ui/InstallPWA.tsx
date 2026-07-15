'use client';
import { useEffect, useState } from 'react';

/**
 * Cài MixStay như ứng dụng (PWA) + đăng ký service worker.
 * - Android / Chrome desktop: bắt sự kiện `beforeinstallprompt` → nút "Cài đặt" 1 chạm.
 * - iPhone/iPad (Safari): iOS không cho cài tự động → hiện hướng dẫn Chia sẻ → Thêm vào Màn hình chính.
 * - iPhone mở bằng Chrome/app khác: iOS chỉ cho cài từ Safari → nhắc mở lại bằng Safari.
 * - Đang chạy dạng app (standalone) hoặc user đã tắt banner → không hiện gì.
 */
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = 'mixstay:a2hs-dismissed';

export default function InstallPWA() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios-safari' | 'ios-other' | 'other'>('other');

  // Đăng ký service worker (chỉ ở domain thật, không chạy ở localhost để dev khỏi dính cache)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return;
    const onLoad = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Đã cài (mở dạng app) → không nhắc
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && 'ontouchend' in document);
    const isIOSSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
    const isIOSOther = isIOS && !isIOSSafari;

    if (isIOSSafari) { setPlatform('ios-safari'); setShow(true); }
    else if (isIOSOther) { setPlatform('ios-other'); setShow(true); }

    // Android / Chrome desktop: chờ trình duyệt báo có thể cài
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setPlatform('android');
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onBIP);

    // Cài xong → ẩn ngay
    const onInstalled = () => { setShow(false); try { localStorage.setItem(DISMISS_KEY, '1'); } catch {} };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[55] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-stone-200 overflow-hidden">
        <div className="flex items-center gap-3 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/apple-touch-icon.png" alt="MixStay" className="w-11 h-11 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-stone-900">Cài MixStay như ứng dụng</p>
            <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">
              {platform === 'android' && 'Thêm vào màn hình chính để mở nhanh như một app.'}
              {platform === 'ios-safari' && 'Thêm vào Màn hình chính iPhone — mở nhanh, toàn màn hình.'}
              {platform === 'ios-other' && 'Trên iPhone cần mở bằng Safari mới cài được app.'}
              {platform === 'other' && 'Thêm vào màn hình chính để mở nhanh như một app.'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {platform === 'android' && (
              <button onClick={install} className="btn-primary text-xs px-3 py-2 whitespace-nowrap">
                Cài đặt
              </button>
            )}
            {platform === 'ios-safari' && (
              <button
                onClick={() => setShowIosHelp((v) => !v)}
                className="btn-primary text-xs px-3 py-2 whitespace-nowrap"
              >
                {showIosHelp ? 'Ẩn' : 'Cách cài'}
              </button>
            )}
            <button
              onClick={dismiss}
              aria-label="Đóng"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Hướng dẫn iOS Safari (bung ra khi bấm "Cách cài") */}
        {platform === 'ios-safari' && showIosHelp && (
          <ol className="border-t border-stone-100 bg-stone-50 px-4 py-3 text-sm text-stone-700 space-y-1.5">
            <li>1. Bấm nút <strong>Chia sẻ</strong> <span className="inline-block align-middle">⬆️</span> ở thanh dưới Safari.</li>
            <li>2. Kéo xuống chọn <strong>Thêm vào Màn hình chính</strong>.</li>
            <li>3. Bấm <strong>Thêm</strong> — icon MixStay sẽ xuất hiện ngoài màn hình.</li>
          </ol>
        )}

        {/* iPhone đang dùng Chrome/app khác → chỉ Safari mới cài được */}
        {platform === 'ios-other' && (
          <div className="border-t border-stone-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
            Mở <strong>mixstay.vn</strong> bằng <strong>Safari</strong>, rồi bấm Chia sẻ → <strong>Thêm vào Màn hình chính</strong>.
          </div>
        )}
      </div>
    </div>
  );
}
