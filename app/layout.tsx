import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import AuthProvider from '@/components/layout/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MiniZen - Tìm phòng chung cư mini nhanh nhất',
    template: '%s | MiniZen',
  },
  description: 'Nền tảng kết nối chủ nhà, môi giới và khách thuê chung cư mini. Tìm phòng miễn phí, hoa hồng minh bạch.',
  keywords: ['chung cư mini', 'thuê phòng', 'Hà Nội', 'phòng trọ', 'môi giới', 'MiniZen'],
  openGraph: {
    title: 'MiniZen - Tìm phòng chung cư mini',
    description: 'Nền tảng kết nối chủ nhà, môi giới và khách thuê chung cư mini.',
    type: 'website',
    locale: 'vi_VN',
    siteName: 'MiniZen',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#006bc9" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px' },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
