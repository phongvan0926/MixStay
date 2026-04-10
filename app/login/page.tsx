'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

const OAUTH_ENABLED = {
  google: !!(process.env.NEXT_PUBLIC_GOOGLE_ENABLED),
  facebook: !!(process.env.NEXT_PUBLIC_FACEBOOK_ENABLED),
  apple: !!(process.env.NEXT_PUBLIC_APPLE_ENABLED),
};

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
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn('credentials', { ...form, redirect: false });
      if (res?.error) {
        toast.error('Email hoặc mật khẩu không đúng');
      } else {
        toast.success('Đăng nhập thành công!');
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        const role = session?.user?.role;
        if (role === 'ADMIN') router.push('/admin/properties');
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
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold">M</span>
            </div>
            <span className="font-display font-bold text-xl">MixStay</span>
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
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
              <input type="email" className="input-field" placeholder="email@example.com" required
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Mật khẩu</label>
              <input type="password" className="input-field" placeholder="••••••••" required
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-stone-500">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="text-brand-600 font-medium hover:underline">Đăng ký</Link>
          </div>
        </div>

        {/* Demo accounts */}
        <div className="mt-6 card p-5">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Tài khoản demo</p>
          <div className="space-y-2">
            {[
              { role: 'Admin', email: 'admin@mixstay.vn' },
              { role: 'Môi giới', email: 'broker@mixstay.vn' },
              { role: 'Chủ nhà', email: 'landlord@mixstay.vn' },
            ].map(d => (
              <button key={d.role} onClick={() => setForm({ email: d.email, password: '123456' })}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-stone-50 transition-colors flex justify-between items-center group">
                <span className="text-stone-700">{d.role}</span>
                <span className="text-stone-400 text-xs group-hover:text-brand-600">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
