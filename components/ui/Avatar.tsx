/**
 * Avatar/Logo dùng chung — MỘT chỗ duy nhất quyết định cách hiển thị ảnh đại diện,
 * để logo CTV / công ty / chủ nhà trông giống hệt nhau ở mọi màn hình
 * (topbar, sidebar, trang share, thẻ công ty ở admin...).
 *
 * Có ảnh  → hiện ảnh, cắt vừa khung.
 * Chưa có → hiện chữ cái đầu trên nền gradient (fallback cũ của dự án, giữ cảm giác quen thuộc).
 */
type AvatarProps = {
  src?: string | null;
  name?: string | null;
  /** px — dùng cho cả width lẫn height */
  size?: number;
  /** bo tròn hoàn toàn (người) hay bo góc (công ty) */
  shape?: 'circle' | 'rounded';
  className?: string;
};

export default function Avatar({ src, name, size = 40, shape = 'circle', className = '' }: AvatarProps) {
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const label = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.42)) };

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Logo'}
        style={style}
        className={`${radius} object-cover bg-stone-100 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={style}
      className={`${radius} shrink-0 flex items-center justify-center font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 ${className}`}
    >
      {label}
    </div>
  );
}
