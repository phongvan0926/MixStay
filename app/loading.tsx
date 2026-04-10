export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center">
        <div className="relative mx-auto w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-stone-200" />
          <div className="absolute inset-0 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-brand-700" style={{ fontFamily: 'var(--font-display)' }}>
          MixStay
        </p>
        <p className="text-xs text-stone-400 mt-1">Dang tai...</p>
      </div>
    </div>
  );
}
