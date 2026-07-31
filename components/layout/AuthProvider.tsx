'use client';
// Ranh giới client cho NextAuth: `SessionProvider` dùng React Context nên bắt buộc phải nằm
// trong Client Component. Bọc ở app/layout.tsx để mọi nơi gọi được useSession()
// (topbar, PublicNav, kho hàng CTV…) mà root layout vẫn là Server Component.
import { SessionProvider } from 'next-auth/react';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
