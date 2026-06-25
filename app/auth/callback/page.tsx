'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Logo from '@/components/ui/Logo';

const ROLES = [
  { value: 'BROKER', label: 'Môi giới', desc: 'Tìm & chia sẻ phòng trống cho khách thuê', icon: '🤝' },
  { value: 'LANDLORD', label: 'Chủ nhà', desc: 'Đăng phòng và quản lý tòa nhà của bạn', icon: '🏠' },
  { value: 'CUSTOMER', label: 'Khách thuê', desc: 'Tìm phòng phù hợp với nhu cầu', icon: '👤' },
];

export default function AuthCallbackPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState('BROKER');
  const [saving, setSaving] = useState(false);

  const needsRoleSetup = (session?.user as any)?.needsRoleSetup;

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.push('/login'); return; }
    // Only redirect when role setup is DEFINITIVELY done. Using `!needsRoleSetup` also
    // matched `undefined` during session hydration → it could redirect a brand-new OAuth
    // user to a dashboard before the chooser ever rendered (the skip/race). Require an
    // explicit `false`; while it's still undefined we keep showing the spinner.
    if (session && needsRoleSetup === false) {
      // Already has role — redirect based on it
      const role = (session.user as any)?.role;
      if (role === 'ADMIN') router.push('/admin/properties');
      else if (role === 'BROKER') router.push('/broker/inventory');
      else if (role === 'LANDLORD') router.push('/landlord/properties');
      else router.push('/');
    }
  }, [session, status, needsRoleSetup, router]);

  const handleSaveRole = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (!res.ok) { toast.error('Có lỗi xảy ra'); return; }

      // Update session token
      await update({ role: selectedRole, needsRoleSetup: false });
      toast.success('Đã thiết lập vai trò!');

      if (selectedRole === 'BROKER') router.push('/broker/inventory');
      else if (selectedRole === 'LANDLORD') router.push('/landlord/properties');
      else router.push('/');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || !needsRoleSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center mx-auto mb-4" aria-label="MixStay - Trang chủ">
            <Logo variant="light" className="h-12 w-auto" />
          </Link>
          <h1 className="font-display text-2xl font-bold">Chào mừng!</h1>
          <p className="text-stone-500 text-sm mt-2">
            Bạn đang đăng ký lần đầu. Vui lòng chọn vai trò của bạn.
          </p>
        </div>

        <div className="card p-6">
          <p className="text-sm font-medium text-stone-700 mb-4">Bạn là</p>
          <div className="space-y-3 mb-6">
            {ROLES.map(r => (
              <button key={r.value} type="button" onClick={() => setSelectedRole(r.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  selectedRole === r.value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}>
                <span className="text-2xl">{r.icon}</span>
                <div>
                  <div className={`font-semibold text-sm ${selectedRole === r.value ? 'text-brand-700' : 'text-stone-800'}`}>
                    {r.label}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">{r.desc}</div>
                </div>
                {selectedRole === r.value && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          <button onClick={handleSaveRole} disabled={saving} className="btn-primary w-full py-3">
            {saving ? 'Đang lưu...' : 'Xác nhận và tiếp tục'}
          </button>
        </div>
      </div>
    </div>
  );
}
