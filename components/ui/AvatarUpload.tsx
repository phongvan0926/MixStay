'use client';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Avatar from './Avatar';

/**
 * Tải LÊN 1 ảnh đại diện / logo (khác ImageUpload vốn dành cho bộ nhiều ảnh tin đăng).
 * Dùng cho: hồ sơ CTV, hồ sơ chủ nhà, logo công ty.
 *
 * Ảnh được thu nhỏ về tối đa 512px + nén WebP ngay trên máy khách trước khi tải lên —
 * logo chỉ hiển thị cỡ 24–64px nên không cần ảnh lớn; giảm dung lượng kho Supabase và
 * băng thông cho khách xem link chia sẻ. Lỗi thu nhỏ thì gửi file gốc, không chặn người dùng.
 */
const MAX_EDGE = 512;
const WEBP_QUALITY = 0.85;
const MAX_BYTES = 5 * 1024 * 1024;

async function downscale(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
    if (!bitmap) return file;
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size <= 200_000) {
      bitmap.close?.();
      return file;
    }
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/webp', WEBP_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, '') || 'logo';
    return new File([blob], `${base}.webp`, { type: 'image/webp', lastModified: file.lastModified });
  } catch {
    return file;
  }
}

type Props = {
  value?: string | null;
  onChange: (url: string) => void;
  /** thư mục trên Supabase Storage, ví dụ 'avatars' hoặc 'logos' */
  folder: string;
  name?: string | null;
  size?: number;
  shape?: 'circle' | 'rounded';
  label?: string;
  hint?: string;
};

export default function AvatarUpload({
  value,
  onChange,
  folder,
  name,
  size = 80,
  shape = 'circle',
  label = 'Ảnh đại diện',
  hint,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Ảnh tối đa 5MB');
      return;
    }
    setUploading(true);
    try {
      const prepared = await downscale(file);
      const fd = new FormData();
      fd.append('file', prepared);
      fd.append('folder', folder);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error || 'Tải ảnh thất bại');
        return;
      }
      onChange(data.url);
      toast.success('Đã tải ảnh lên');
    } catch {
      toast.error('Tải ảnh thất bại');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-2">{label}</label>
      <div className="flex items-center gap-4">
        <Avatar src={value} name={name} size={size} shape={shape} />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 text-sm rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-60"
            >
              {uploading ? 'Đang tải...' : value ? 'Đổi ảnh' : 'Tải ảnh lên'}
            </button>
            {value && !uploading && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-3 py-1.5 text-sm rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50"
              >
                Gỡ ảnh
              </button>
            )}
          </div>
          {hint && <p className="text-xs text-stone-400 max-w-xs">{hint}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => pick(e.target.files?.[0])}
      />
    </div>
  );
}
