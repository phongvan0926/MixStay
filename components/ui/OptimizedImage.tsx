'use client';
import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fallback?: 'property' | 'room';
  fill?: boolean;
  sizes?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fallback = 'room',
  fill = false,
  sizes,
  onClick,
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 ${className}`}
        style={!fill ? { width, height } : undefined}
        onClick={onClick}
      >
        {fallback === 'property' ? (
          <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div className={fill ? 'relative w-full h-full' : 'relative'} style={!fill ? { width, height } : undefined}>
      {loading && (
        <div className={`absolute inset-0 bg-stone-200 animate-pulse rounded ${fill ? '' : ''}`} />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        quality={80}
        sizes={sizes || (fill ? '(max-width: 768px) 100vw, 50vw' : undefined)}
        loading={priority ? undefined : 'lazy'}
        priority={priority}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        onClick={onClick}
      />
    </div>
  );
}
