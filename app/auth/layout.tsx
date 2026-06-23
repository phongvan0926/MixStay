import AuthProvider from '@/components/layout/AuthProvider';

// The OAuth role-selection page (/auth/callback) calls useSession(), so it needs
// the next-auth SessionProvider. It lives here (not the root layout) to keep
// next-auth/react out of the public/share route bundles.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
