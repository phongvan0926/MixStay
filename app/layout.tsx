import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/next';
import AuthProvider from '@/components/layout/AuthProvider';
import InstallPWA from '@/components/ui/InstallPWA';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://mixstay.vn'),
  title: {
    default: 'MixStay - Tìm phòng chung cư mini nhanh nhất',
    template: '%s | MixStay',
  },
  description: 'Nền tảng kết nối chủ nhà, cộng tác viên và khách thuê chung cư mini. Tìm phòng miễn phí, hoa hồng minh bạch.',
  keywords: ['chung cư mini', 'thuê phòng', 'Hà Nội', 'phòng trọ', 'cộng tác viên', 'MixStay'],
  applicationName: 'MixStay',
  manifest: '/manifest.json',
  // Cài lên Màn hình chính iPhone: iOS bỏ qua manifest, chỉ đọc các meta apple-* dưới đây.
  appleWebApp: {
    capable: true,        // mở full-screen như app (ẩn thanh Safari)
    title: 'MixStay',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'MixStay - Tìm phòng chung cư mini',
    description: 'Nền tảng kết nối chủ nhà, cộng tác viên và khách thuê chung cư mini.',
    type: 'website',
    locale: 'vi_VN',
    siteName: 'MixStay',
  },
  // Xác minh quyền sở hữu mixstay.vn trong Google Search Console (để nộp sitemap + xem
  // truy vấn tìm kiếm). KHÔNG được xoá: xoá là mất trạng thái xác minh.
  // Đây không phải khoá bí mật — Google yêu cầu công khai trong <head> của trang.
  verification: {
    google: '7ry_JgLeNOq_rFIXdWtV62L0zSy9wrzHyPL7hl_okcs',
  },
};

export const viewport: Viewport = {
  themeColor: '#1b3624',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // tràn viền dưới notch/thanh home khi chạy standalone
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          {children}
          <InstallPWA />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px' },
            }}
          />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
