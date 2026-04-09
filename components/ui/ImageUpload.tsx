'use client';
import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface ImageUploadProps {
  images: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  folder: string;
}

export default function ImageUpload({ images, onChange, maxImages = 10, folder }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = maxImages - images.length;

    if (remaining <= 0) {
      toast.error(`Tối đa ${maxImages} ảnh`);
      return;
    }

    const toUpload = fileArray.slice(0, remaining);
    if (toUpload.length < fileArray.length) {
      toast.error(`Chỉ upload được ${remaining} ảnh nữa`);
    }

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of toUpload) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} không phải ảnh`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} vượt quá 5MB`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);
        newUrls.push(data.url);
      } catch (err: any) {
        toast.error(`Lỗi upload ${file.name}: ${err.message}`);
      }
    }

    if (newUrls.length > 0) {
      onChange([...images, ...newUrls]);
      toast.success(`Đã upload ${newUrls.length} ảnh`);
    }
    setUploading(false);
  }, [images, maxImages, folder, onChange]);

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [uploadFiles]);

  // Reorder drag handlers
  const handleReorderDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const reordered = [...images];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    onChange(reordered);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div>
      {/* Grid of uploaded images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
          {images.map((url, i) => (
            <div
              key={url}
              className={`relative group aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                dragOverIdx === i ? 'border-brand-400 scale-[0.97]' : 'border-stone-200'
              }`}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={() => handleReorderDrop(i)}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            >
              <OptimizedImage src={url} alt={`Ảnh ${i + 1}`} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
              {/* Badge for first image */}
              {i === 0 && (
                <span className="absolute top-2 left-2 badge bg-brand-600 text-white text-[10px] px-2 py-0.5">
                  Ảnh bìa
                </span>
              )}
              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 text-sm"
              >
                &times;
              </button>
              {/* Index */}
              <span className="absolute bottom-2 left-2 text-[10px] text-white/70 font-medium">
                {i + 1}/{images.length}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {images.length < maxImages && (
        <div
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-brand-400 bg-brand-50'
              : 'border-stone-300 hover:border-brand-300 hover:bg-stone-50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-stone-500">Đang upload...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-700">
                  Kéo thả ảnh vào đây hoặc <span className="text-brand-600">chọn file</span>
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  PNG, JPG, WEBP — tối đa 5MB/ảnh — còn {maxImages - images.length} ảnh
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
