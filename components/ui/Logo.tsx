/**
 * Logo MixStay dùng chung — thay cho 8 chỗ trước đây vẽ ô vuông "M" bằng CSS.
 *
 *  - variant="light" → logo ngang (emblem + chữ "MixStay"), nền TRONG SUỐT.
 *      Dùng cho navbar/header nền SÁNG. Ảnh đã gồm sẵn wordmark nên KHÔNG kèm text "MixStay" bên cạnh.
 *  - variant="dark"  → logo TRÒN nền xanh đậm (logo.png). Dùng cho footer tối / dải xanh.
 *
 * Plain <img> (không hook, không 'use client') nên dùng được cả Server lẫn Client Component.
 * File ảnh nhẹ (đã downscale) → không ảnh hưởng LCP.
 */
type Variant = 'light' | 'dark';

const SRC: Record<Variant, string> = {
  light: '/logo-nav.png',   // emblem + wordmark, transparent (cho nền sáng)
  dark: '/logo.png',        // logo tròn nền xanh đậm (cho nền tối)
};

export default function Logo({
  variant = 'light',
  className = 'h-8 w-auto',
  alt = 'MixStay',
}: {
  variant?: Variant;
  className?: string;
  alt?: string;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={SRC[variant]} alt={alt} className={className} draggable={false} />;
}
