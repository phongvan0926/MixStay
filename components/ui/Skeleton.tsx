export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 animate-pulse">
      <div className="h-40 bg-stone-200 rounded-xl mb-4" />
      <div className="h-4 bg-stone-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-stone-200 rounded w-1/2 mb-3" />
      <div className="h-5 bg-stone-200 rounded w-1/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden animate-pulse">
      <div className="border-b border-stone-100 p-4">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3 bg-stone-200 rounded flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-stone-100 last:border-0 p-4">
          <div className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-3 bg-stone-200 rounded flex-1" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count > 4 ? '4' : count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-stone-200 p-4 animate-pulse">
          <div className="h-3 bg-stone-200 rounded w-1/2 mb-3" />
          <div className="h-6 bg-stone-200 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-stone-200 rounded" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-stone-200 p-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-stone-200 rounded-xl shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-stone-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-stone-200 rounded w-1/2" />
            </div>
            <div className="h-6 bg-stone-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
