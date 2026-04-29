'use client';

interface Props {
  href: string;
}

/**
 * Floating Zalo button — fixed bottom-right.
 * z-50 so above content, dưới modal (z-100+).
 * Safe-area-inset on iOS.
 * Mobile: hide text, only icon. Desktop ≥sm: icon + text.
 */
export default function ZaloFab({ href }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Tư vấn Zalo"
      className="fixed z-50 right-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-[#0068FF] text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 hover:shadow-xl active:scale-95
        h-14 sm:h-12 px-3 sm:px-4
        font-semibold text-sm"
      style={{
        // Respect iOS safe-area at the bottom (notch/home-indicator)
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        marginBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      {/* Zalo logo (simplified official mark, white on blue) */}
      <svg width="28" height="28" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <path
          d="M32 4C15.43 4 2 14.95 2 28.46c0 7.5 4.06 14.2 10.42 18.7-.3 2.21-1.36 5.62-3.27 8.32-.39.55.07 1.31.74 1.18 4.6-.86 9.45-2.86 12.42-4.7 2.83.83 5.84 1.27 8.69 1.27 16.57 0 30-10.95 30-24.46S48.57 4 32 4Z"
          fill="white"
        />
        <text x="32" y="36" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="900" fontSize="18" fill="#0068FF">
          Zalo
        </text>
      </svg>
      <span className="hidden sm:inline whitespace-nowrap">Tư vấn Zalo</span>
    </a>
  );
}
