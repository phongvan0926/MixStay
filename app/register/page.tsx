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

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'BROKER' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: string) => {
    setOauthLoading(provider);
    try {
      // Redirect to callback page — if new user, role selection modal appears there
      await signIn(provider, { callbackUrl: '/auth/callback' });
    } catch {
      toast.error('Không thể kết nối. Vui lòng thử lại.');
      setOauthLoading(null);
    }
  };

  const set = (key: string, val: string) => setForm({ ...form, [key]: val });

  const hasAnyOAuth = OAUTH_ENABLED.google || OAUTH_ENABLED.facebook || OAUTH_ENABLED.apple;

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold">M</span>
            </div>
            <span className="font-display font-bold text-xl">MixStay</span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Tạo tài khoản</h1>
          <p className="text-stone-500 text-sm mt-1">Tham gia nền tảng quản lý chung cư mini</p>
        </div>

        <div className="card p-8">
          {/* OAuth quick signup */}
          {hasAnyOAuth && (
            <>
              <p className="text-xs text-stone-500 text-center mb-3">Đăng ký nhanh</p>
              <div className="space-y-3 mb-6">
                {OAUTH_ENABLED.google && (
                  <button onClick={() => handleOAuth('google')} disabled={!!oauthLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-700 font-medium text-sm hover:bg-stone-50 hover:border-stone-300 transition-all disabled:opacity-60">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    {oauthLoading === 'google' ? 'Đang kết nối...' : 'Đăng ký với Google'}
                  </button>
                )}
                {OAUTH_ENABLED.facebook && (
                  <button onClick={() => handleOAuth('facebook')} disabled={!!oauthLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#1877F2] text-white font-medium text-sm hover:bg-[#166fe5] transition-all disabled:opacity-60">
                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    {oauthLoading === 'facebook' ? 'Đang kết nối...' : 'Đăng ký với Facebook'}
                  </button>
                )}
                {OAUTH_ENABLED.apple && (
                  <button onClick={() => handleOAuth('apple')} disabled={!!oauthLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-black text-white font-medium text-sm hover:bg-stone-800 transition-all disabled:opacity-60">
                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                    </svg>
                    {oauthLoading === 'apple' ? 'Đang kết nối...' : 'Đăng ký với Apple'}
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-stone-400">hoặc đăng ký bằng email</span>
                </div>
              </div>
            </>
          )}

          {/* Manual form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Bạn là</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'BROKER', label: '🤝 Môi giới' },
                  { value: 'LANDLORD', label: '🏠 Chủ nhà' },
                  { value: 'CUSTOMER', label: '👤 Khách thuê' },
                ].map(r => (
                  <button key={r.value} type="button" onClick={() => set('role', r.value)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      form.role === r.value
                        ? 'bg-brand-50 border-brand-200 text-brand-700'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Họ tên</label>
              <input type="text" className="input-field" placeholder="Nguyễn Văn A" required
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
              <input type="email" className="input-field" placeholder="email@example.com" required
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Số điện thoại</label>
              <input type="tel" className="input-field" placeholder="0912 345 678"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Mật khẩu</label>
              <input type="password" className="input-field" placeholder="Tối thiểu 6 ký tự" required minLength={6}
                value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-stone-500">
            Đã có tài khoản?{' '}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">Đăng nhập</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
