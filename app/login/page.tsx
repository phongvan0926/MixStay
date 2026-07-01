'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Logo from '@/components/ui/Logo';

const OAUTH_ENABLED = {
  google: process.env.NEXT_PUBLIC_GOOGLE_ENABLED === 'true',
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_ENABLED === 'true',
  apple: process.env.NEXT_PUBLIC_APPLE_ENABLED === 'true',
};

// The demo-account quick-fill panel is for LOCAL testing only. process.env.NODE_ENV
// is statically inlined at build time, so in a production build this is `false` and
// the panel is dead-code-eliminated from the bundle (explicit compare — never !!()).
const SHOW_DEMO = process.env.NODE_ENV === 'development';

function OAuthButton({
  provider, label, onClick, loading, icon, className,
}: {
  provider: string; label: string; onClick: () => void;
  loading: boolean; icon: React.ReactNode; className: string;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border font-medium text-sm transition-all disabled:opacity-60 ${className}`}>
      {icon}
      {loading ? 'Đang kết nối...' : label}
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn('credentials', { ...form, redirect: false });
      if (res?.error) {
        toast.error('Email/SĐT hoặc mật khẩu không đúng');
      } else {
        toast.success('Đăng nhập thành công!');
        // Ghi nhớ đăng nhập: bỏ tick → biến cookie phiên thành session cookie (mất khi đóng trình duyệt).
        // Lỗi ở bước này không chặn đăng nhập (giữ mặc định 30 ngày).
        if (!rememberMe) {
          try {
            await fetch('/api/auth/remember', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ remember: false }),
            });
          } catch { /* giữ mặc định */ }
        }
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        const role = session?.user?.role;
        if (role === 'ADMIN' || role === 'ADMIN_STAFF') router.push('/admin/properties');
        else if (role === 'BROKER') router.push('/broker/inventory');
        else if (role === 'LANDLORD') router.push('/landlord/properties');
        else router.push('/');
      }
    } catch { toast.error('Có lỗi xảy ra'); }
    setLoading(false);
  };

  const handleOAuth = async (provider: string) => {
    setOauthLoading(provider);
    try {
      await signIn(provider, { callbackUrl: '/auth/callback' });
    } catch {
      toast.error('Không thể kết nối. Vui lòng thử lại.');
      setOauthLoading(null);
    }
  };

  const hasAnyOAuth = OAUTH_ENABLED.google || OAUTH_ENABLED.facebook || OAUTH_ENABLED.apple;

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center mb-6" aria-label="MixStay - Trang chủ">
            <Logo variant="light" className="h-9 w-auto" />
          </Link>
          <h1 className="font-display text-2xl font-bold">Đăng nhập</h1>
          <p className="text-stone-500 text-sm mt-1">Chào mừng bạn trở lại</p>
        </div>

        <div className="card p-8">
          {/* OAuth Buttons */}
          {hasAnyOAuth && (
            <>
              <div className="space-y-3 mb-6">
                {OAUTH_ENABLED.google && (
                  <OAuthButton provider="google" label="Đăng nhập với Google"
                    loading={oauthLoading === 'google'} onClick={() => handleOAuth('google')}
                    className="bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300"
                    icon={
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    }
                  />
                )}
                {OAUTH_ENABLED.facebook && (
                  <OAuthButton provider="facebook" label="Đăng nhập với Facebook"
                    loading={oauthLoading === 'facebook'} onClick={() => handleOAuth('facebook')}
                    className="bg-[#1877F2] border-[#1877F2] text-white hover:bg-[#166fe5]"
                    icon={
                      <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    }
                  />
                )}
                {OAUTH_ENABLED.apple && (
                  <OAuthButton provider="apple" label="Đăng nhập với Apple"
                    loading={oauthLoading === 'apple'} onClick={() => handleOAuth('apple')}
                    className="bg-black border-black text-white hover:bg-stone-800"
                    icon={
                      <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                      </svg>
                    }
                  />
                )}
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-stone-400">hoặc đăng nhập bằng email</span>
                </div>
              </div>
            </>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Email hoặc Số điện thoại</label>
              <input type="text" className="input-field" placeholder="email@example.com hoặc 0912 345 678" required
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className="input-field pr-10" placeholder="••••••••" required
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 accent-brand-600" />
              <span className="text-sm text-stone-600">Ghi nhớ đăng nhập trên thiết bị này</span>
            </label>
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-stone-500">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="text-brand-600 font-medium hover:underline">Đăng ký</Link>
          </div>
        </div>

        {/* Demo accounts — local dev only (hidden in production) */}
        {SHOW_DEMO && (
        <div className="mt-6 card p-5">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Tài khoản demo</p>
          <p className="text-[11px] text-stone-400 mb-3">Bấm để tự điền email và mật khẩu. Mật khẩu cho tất cả tài khoản demo: <code className="bg-stone-100 px-1 rounded">123456</code></p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: '👑', role: 'Super Admin',      email: 'admin@mixstay.vn',     color: 'border-red-200 bg-red-50/30 text-red-700' },
              { icon: '🛡️', role: 'Staff (manager)',  email: 'manager@mixstay.vn',   color: 'border-violet-200 bg-violet-50/30 text-violet-700' },
              { icon: '🛡️', role: 'Staff',            email: 'staff@mixstay.vn',     color: 'border-blue-200 bg-blue-50/30 text-blue-700' },
              { icon: '🤝', role: 'Cộng tác viên',          email: 'broker@mixstay.vn',    color: 'border-amber-200 bg-amber-50/30 text-amber-700' },
              { icon: '🏠', role: 'Chủ nhà',           email: 'landlord@mixstay.vn',  color: 'border-emerald-200 bg-emerald-50/30 text-emerald-700' },
              { icon: '🏢', role: 'Chủ nhà công ty',   email: 'company@mixstay.vn',   color: 'border-teal-200 bg-teal-50/30 text-teal-700' },
              { icon: '👤', role: 'Khách',             email: 'customer@mixstay.vn',  color: 'border-stone-200 bg-stone-50/30 text-stone-700' },
            ].map(d => (
              <button key={d.email} onClick={() => setForm({ email: d.email, password: '123456' })}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-all hover:shadow-sm hover:-translate-y-0.5 ${d.color}`}>
                <div className="flex items-center gap-1.5">
                  <span>{d.icon}</span>
                  <span className="font-medium truncate">{d.role}</span>
                </div>
                <p className="text-[10px] text-stone-500 mt-0.5 truncate">{d.email}</p>
              </button>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
