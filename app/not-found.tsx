import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center mb-6">
          <span className="text-3xl font-bold text-brand-600" style={{ fontFamily: 'var(--font-display)' }}>404</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Trang khong ton tai
        </h1>
        <p className="text-stone-500 mb-8">
          Duong dan ban truy cap khong dung hoac trang da bi xoa.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary">
            Ve trang chu
          </Link>
          <Link href="/auth/signin" className="btn-secondary">
            Dang nhap
          </Link>
        </div>
      </div>
    </div>
  );
}
